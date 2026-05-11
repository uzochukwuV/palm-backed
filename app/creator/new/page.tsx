'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppNavbar } from '@/components/app/app-navbar'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Loader2, Wallet, Zap } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useSolanaProgram } from '@/hooks/use-solana-program'
import { uuidToProjectId } from '@/lib/solana/program'

const categories = [
  'Software',
  'Design',
  'Education',
  'Music',
  'Hardware',
  'Writing',
  'Food',
  'Film',
  'Art',
  'Games',
  'Other',
]

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string; username?: string } | null>(null)
  const { publicKey, connected, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const { initProject, isLoading: isChainLoading, error: chainError, clearError } = useSolanaProgram()
  
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    category: '',
    funding_goal: '',
    deadline: '',
  })
  const [useRelayGas, setUseRelayGas] = useState(false)

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', authUser.id)
          .single()
        
        setUser({
          id: authUser.id,
          email: authUser.email,
          username: profile?.username,
        })
      }
    }
    
    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    clearError()

    if (!connected || !publicKey) {
      setError('Connect a Solana wallet before creating an on-chain project')
      setVisible(true)
      setIsLoading(false)
      return
    }

    if (!formData.funding_goal || parseFloat(formData.funding_goal) <= 0) {
      setError('Funding goal must be greater than 0 SOL')
      setIsLoading(false)
      return
    }

    if (!formData.deadline) {
      setError('Choose a funding deadline')
      setIsLoading(false)
      return
    }

    const deadlineUnixTs = Math.floor(new Date(formData.deadline).getTime() / 1000)
    if (deadlineUnixTs <= Math.floor(Date.now() / 1000)) {
      setError('Funding deadline must be in the future')
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('You must be logged in to create a project')
      setIsLoading(false)
      return
    }

    // Create project
    const { data, error: createError } = await supabase
      .from('projects')
      .insert({
        creator_id: user.id,
        title: formData.title,
        tagline: formData.tagline || null,
        description: formData.description || null,
        category: formData.category,
        funding_goal: parseFloat(formData.funding_goal),
        status: 'active',
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setIsLoading(false)
      return
    }

    const onChainProjectId = uuidToProjectId(data.id)
    let signature: string | null = null

    if (useRelayGas) {
      // Phase 1: Ask API to build + relay-sign the tx
      try {
        const response = await fetch('/api/relay/init-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: data.id,
            creatorWallet: publicKey.toBase58(),
            budgetSol: parseFloat(formData.funding_goal),
            deadlineUnixTs,
          }),
        })

        const json = await response.json()
        if (!json.success) {
          throw new Error(json.error || 'Relay initialization failed')
        }

        console.log('✅ Received relay-signed transaction from backend')

        // Phase 2: Deserialize, creator signs, broadcast
        const { Transaction, Connection } = await import('@solana/web3.js')
        const txBuffer = Buffer.from(json.transaction, 'base64')
        const transaction = Transaction.from(txBuffer)

        console.log('Transaction after deserialization:', {
          signatures: transaction.signatures.map(s => ({
            pubkey: s.publicKey?.toBase58(),
            signature: s.signature ? 'present' : 'null'
          })),
          feePayer: transaction.feePayer?.toBase58()
        })

        // Creator signs (relay sig is already embedded)
        if (!signTransaction) {
          throw new Error('Wallet does not support transaction signing')
        }
        
        const signedTx = await signTransaction(transaction)
        
        console.log('Transaction after creator signs:', {
          signatures: signedTx.signatures.map(s => ({
            pubkey: s.publicKey?.toBase58(),
            signature: s.signature ? 'present' : 'null'
          }))
        })

        // Broadcast with both signatures
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
            ? process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com'
            : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com',
          'confirmed'
        )

        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        })

        console.log('✅ Transaction sent:', signature)
        await connection.confirmTransaction(signature, 'confirmed')
        console.log('✅ Transaction confirmed')
      } catch (err) {
        console.error('❌ Relay gas error:', err)
        setError(`Relay gas failed: ${err instanceof Error ? err.message : 'Unknown error'}. Try without relay.`)
        setIsLoading(false)
        return
      }
    } else {
      // Direct wallet initialization
      signature = await initProject(
        onChainProjectId,
        parseFloat(formData.funding_goal),
        deadlineUnixTs
      )
    }

    if (!signature) {
      setError('Project was saved, but on-chain initialization failed. Open the project settings to retry.')
      setIsLoading(false)
      router.push(`/creator/project/${data.id}`)
      return
    }

    const { error: chainUpdateError } = await supabase
      .from('projects')
      .update({
        creator_wallet: publicKey.toBase58(),
        on_chain_project_id: onChainProjectId.toString(),
        on_chain_deadline_unix_ts: deadlineUnixTs,
        on_chain_tx_signature: signature,
        on_chain_total_funded: 0,
      })
      .eq('id', data.id)

    if (chainUpdateError) {
      setError(`Project initialized on-chain, but metadata could not be saved: ${chainUpdateError.message}`)
      setIsLoading(false)
      return
    }

    // Redirect to project management page
    router.push(`/creator/project/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar user={user} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Back Button */}
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create a New Project</CardTitle>
              <CardDescription>
                Share your vision with the world and start building in public
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., AI-Powered Writing Assistant"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="A short description of your project"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    A brief one-liner that captures what your project is about
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Funding Goal */}
                <div className="space-y-2">
                  <Label htmlFor="funding_goal">Funding Goal (SOL)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">◎</span>
                    <Input
                      id="funding_goal"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="10"
                      className="pl-8"
                      value={formData.funding_goal}
                      onChange={(e) => setFormData({ ...formData, funding_goal: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This SOL amount is enforced by the deployed Solana program.
                  </p>
                </div>

                {/* Funding Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="deadline">Funding Deadline *</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Creators can withdraw after this deadline according to the smart contract.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell people about your project, what you're building, and why it matters..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Relay Gas Option */}
                <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                  <Checkbox
                    id="relay-gas"
                    checked={useRelayGas}
                    onCheckedChange={(checked) => setUseRelayGas(checked as boolean)}
                  />
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor="relay-gas"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                    >
                      <Zap className="h-4 w-4 text-primary" />
                      Use sponsored gas (Relay Wallet)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Let our relay wallet pay for the transaction fees. Your wallet will still sign to prove ownership.
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {(error || chainError) && (
                  <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error || chainError}
                  </div>
                )}

                {!connected && (
                  <div className="p-4 rounded-lg border border-border bg-muted/40 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">Wallet required</p>
                      <p className="text-xs text-muted-foreground">Connect Phantom or Solflare to initialize your project vault.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setVisible(true)}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading || isChainLoading || !formData.title || !formData.category || !formData.funding_goal || !formData.deadline || !connected}
                  >
                    {isLoading || isChainLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
