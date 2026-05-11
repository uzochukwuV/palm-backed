'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { useSNSDomain } from '@/hooks/use-sns-domain'
import { Globe, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'

export function SNSDomainButton() {
  const { publicKey, connected } = useWallet()
  const { domain, loading } = useSNSDomain(connected ? publicKey : null)

  if (!connected) {
    return null
  }

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="rounded-full"
      >
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="hidden sm:inline text-xs">SNS Domain</span>
      </Button>
    )
  }

  if (domain) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-primary/30 bg-primary/5 hover:bg-primary/10"
      >
        <Globe className="h-4 w-4 mr-2 text-primary" />
        <span className="font-mono text-sm font-semibold text-primary">{domain}</span>
      </Button>
    )
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="rounded-full border-border/50"
    >
      <a href="https://sns.id" target="_blank" rel="noopener noreferrer">
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline text-xs">Get Domain</span>
      </a>
    </Button>
  )
}
