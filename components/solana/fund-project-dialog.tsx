"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useSolanaProgram } from "@/hooks/use-solana-program";
import { useKiraPay } from "@/hooks/use-kira-pay";
import { createClient } from "@/lib/supabase/client";
import { SOLANA_EXPLORER_CLUSTER } from "@/lib/solana/program";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, Sparkles, ExternalLink } from "lucide-react";
import { PaymentMethodSelector, type PaymentMethod } from "./payment-method-selector";

interface FundProjectDialogProps {
  projectId: string;
  projectTitle: string;
  creatorWallet: string;
  onChainProjectId: string;
  currentFunding: number;
  fundingGoal: number;
  trigger?: React.ReactNode;
}

export function FundProjectDialog({
  projectId,
  projectTitle,
  creatorWallet,
  onChainProjectId,
  currentFunding,
  fundingGoal,
  trigger,
}: FundProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('solana');
  const [amount, setAmount] = useState("");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { fundProjectAction, isLoading, error, clearError } = useSolanaProgram();
  const {
    initiateCrossChainPayment,
    isLoading: isKiraLoading,
    error: kiraError,
    clearError: clearKiraError
  } = useKiraPay({
    projectId,
    projectTitle,
    creatorWallet,
    onChainProjectId
  });

  const remainingToGoal = Math.max(0, fundingGoal - currentFunding);
  const amountNum = parseFloat(amount) || 0;

  const handleFund = async () => {
    if (!amount || amountNum <= 0) return;
    
    clearError();
    
    const signature = await fundProjectAction(
      creatorWallet,
      BigInt(onChainProjectId),
      amountNum
    );

    if (signature) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("contributions").insert({
        project_id: projectId,
        backer_id: user?.id || null,
        amount: amountNum,
        transaction_signature: signature,
      });

      await supabase
        .from("projects")
        .update({
          current_funding: currentFunding + amountNum,
          on_chain_total_funded: currentFunding + amountNum,
        })
        .eq("id", projectId);

      setTxSignature(signature);
      setAmount("");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTxSignature(null);
    setAmount("");
    setShowPaymentMethod(false);
    clearError();
    clearKiraError();
  };

  const handleOpenDialog = () => {
    setOpen(true);
    setShowPaymentMethod(true);
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowPaymentMethod(false);
    
    if (method === 'crosschain') {
      // Initiate KiraPay cross-chain payment
      if (!amount || parseFloat(amount) <= 0) {
        setShowPaymentMethod(true);
        return;
      }
      
      const result = await initiateCrossChainPayment(
        parseFloat(amount),
        'USDC', // Default to USDC for cross-chain
        publicKey?.toBase58()
      );
      
      if (result.success) {
        // Payment window opened, show pending state
        setTxSignature('pending-kira-payment');
      }
    } else if (!connected) {
      setVisible(true);
    }
  };

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const presetAmounts = [0.1, 0.5, 1, 5];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild onClick={handleOpenDialog}>
          {trigger || (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Back this Project
            </Button>
          )}
        </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {txSignature ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                <span className="text-4xl mb-4 block">🎉</span>
                Thank You for Backing!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your contribution to &quot;{projectTitle}&quot; has been confirmed on-chain.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Signature</p>
                <p className="font-mono text-sm break-all">{txSignature}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}${SOLANA_EXPLORER_CLUSTER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Solana Explorer
                </a>
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : !connected ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your Wallet</DialogTitle>
              <DialogDescription>
                Connect your Solana wallet to back this project.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Button
                onClick={handleConnectWallet}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Back &quot;{projectTitle}&quot;</DialogTitle>
              <DialogDescription>
                Your contribution will be sent directly to the project&apos;s on-chain vault.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Preset amounts */}
              <div className="flex gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amountNum === preset ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAmount(preset.toString())}
                  >
                    {preset} SOL
                  </Button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Custom Amount (SOL)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    SOL
                  </span>
                </div>
              </div>

              {/* Progress info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current funding</span>
                  <span className="font-medium">{currentFunding.toFixed(2)} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="font-medium">{fundingGoal.toFixed(2)} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium text-primary">{remainingToGoal.toFixed(2)} SOL</span>
                </div>
              </div>

              {/* Error message */}
              {(error || kiraError) && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                  {error || kiraError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleFund}
                disabled={isLoading || isKiraLoading || !amount || amountNum <= 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {(isLoading || isKiraLoading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedPaymentMethod === 'crosschain' ? 'Opening KiraPay...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Back with {amountNum > 0 ? `${amountNum} SOL` : "SOL"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      </Dialog>

      <PaymentMethodSelector
        open={showPaymentMethod}
        onOpenChange={setShowPaymentMethod}
        onSelect={handlePaymentMethodSelect}
        isLoading={isLoading}
      />
    </>
  );
}
