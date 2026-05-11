"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Globe, Check } from "lucide-react";

export type PaymentMethod = 'solana' | 'crosschain';

interface PaymentMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: PaymentMethod) => void;
  isLoading?: boolean;
}

export function PaymentMethodSelector({
  open,
  onOpenChange,
  onSelect,
  isLoading = false,
}: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState<PaymentMethod>('solana');

  const handleContinue = () => {
    onSelect(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you'd like to fund this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Direct Solana Payment */}
          <Card
            className={`cursor-pointer border-2 transition-all ${
              selected === 'solana'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelected('solana')}
          >
            <div className="p-4 flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded border-2 border-primary flex items-center justify-center">
                {selected === 'solana' && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Direct on Solana</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fast, direct payment using your Solana wallet
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    ✓ USDC, PUSD, or USDT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Low transaction fees
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Instant confirmation
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Cross-Chain Payment via Kira Pay */}
          <Card
            className={`cursor-pointer border-2 transition-all opacity-75 ${
              selected === 'crosschain'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelected('crosschain')}
          >
            <div className="p-4 flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded border-2 border-primary/50 flex items-center justify-center">
                {selected === 'crosschain' && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Cross-Chain (Kira Pay)</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fund from Ethereum, Polygon, and other chains
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    ✓ Multiple blockchain support
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ USDC, USDT, and other stablecoins
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Automatic cross-chain bridging
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            disabled={isLoading || selected === 'crosschain'}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            Continue with {selected === 'solana' ? 'Solana' : 'Kira Pay'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          All payments are securely processed and go directly to the creator&apos;s vault.
        </p>
      </DialogContent>
    </Dialog>
  );
}
