import { NextRequest, NextResponse } from 'next/server';
import { recordKiraPayContribution } from '@/lib/kira-pay/actions';

/**
 * Webhook endpoint for Kira Pay payment notifications
 * 
 * This endpoint receives payment confirmations from Kira Pay
 * The off-chain backend node should forward these to this endpoint
 * or this can be called directly by Kira Pay's webhook system
 * 
 * Expected payload from Kira Pay:
 * {
 *   "event": "payment.completed",
 *   "code": "payment_link_code",
 *   "amount": 100,
 *   "currency": "USDC",
 *   "status": "completed",
 *   "transactionHash": "0x...",
 *   "metadata": {
 *     "projectId": "...",
 *     "backerId": "...",
 *     ...
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement based on Kira Pay's security requirements)
    const signature = request.headers.get('x-kira-signature');
    if (!signature && process.env.NODE_ENV === 'production') {
      console.error('[v0] Missing Kira Pay webhook signature');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { event, code, amount, currency, status, transactionHash, metadata } = body;

    console.log('[v0] Received Kira Pay webhook:', { event, code, status });

    // Handle payment completed event
    if (event === 'payment.completed' && status === 'completed') {
      if (!metadata?.projectId || !metadata?.backerId) {
        return NextResponse.json(
          { error: 'Missing required metadata' },
          { status: 400 }
        );
      }

      const result = await recordKiraPayContribution({
        projectId: metadata.projectId,
        backerId: metadata.backerId,
        amount,
        currency,
        kiraPaymentCode: code,
        transactionHash,
      });

      if (!result.success) {
        console.error('[v0] Failed to record contribution:', result.error);
        return NextResponse.json(
          { error: 'Failed to record contribution' },
          { status: 500 }
        );
      }

      console.log('[v0] Successfully recorded Kira Pay contribution');
      return NextResponse.json({ success: true });
    }

    // Handle other events
    if (event === 'payment.failed') {
      console.warn('[v0] Kira Pay payment failed:', { code, reason: body.reason });
      // TODO: Notify user of failed payment
    }

    if (event === 'payment.pending') {
      console.log('[v0] Kira Pay payment pending:', { code });
      // TODO: Show pending status to user
    }

    // Acknowledge receipt of webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Kira Pay webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// For health checks
export async function GET() {
  return NextResponse.json(
    { message: 'Kira Pay webhook endpoint is active' },
    { status: 200 }
  );
}
