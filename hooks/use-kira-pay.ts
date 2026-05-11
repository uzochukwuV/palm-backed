import { useState } from 'react';
import { createKiraPaymentLink } from '@/lib/kira-pay/actions';

interface UseKiraPayOptions {
  projectId: string;
  projectTitle: string;
}

export function useKiraPay({ projectId, projectTitle }: UseKiraPayOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const initiateCrossChainPayment = async (
    amount: number,
    currency: 'USDC' | 'USDT' | 'PUSD',
    backerEmail?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createKiraPaymentLink({
        projectId,
        projectTitle,
        amount,
        currency,
        backerEmail,
      });

      if (result.success && result.paymentLink) {
        const url = result.paymentLink.url;
        setPaymentUrl(url);
        
        // Open Kira Pay payment link in new window
        const paymentWindow = window.open(
          url,
          'kira-pay',
          'width=600,height=700'
        );

        if (!paymentWindow) {
          setError('Unable to open payment window. Please check popup blockers.');
        }

        return {
          success: true,
          paymentUrl: url,
          paymentCode: result.paymentLink.code,
        };
      } else {
        const errorMsg = result.error || 'Failed to create payment link';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);
  const resetState = () => {
    setError(null);
    setPaymentUrl(null);
  };

  return {
    initiateCrossChainPayment,
    isLoading,
    error,
    paymentUrl,
    clearError,
    resetState,
  };
}
