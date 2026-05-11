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
      if (!metadata?.projectId || !metadata?.creatorWallet || !metadata?.onChainProjectId) {
        return NextResponse.json(
          { error: 'Missing required metadata (projectId, creatorWallet, onChainProjectId)' },
          { status: 400 }
        );
      }

      // Convert amount to SOL equivalent (simplified - in production, use proper conversion)
      const amountSol = parseFloat(amount);

      // Call relay funding endpoint to fund on-chain
      const relayResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/relay/fund-project`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: metadata.projectId,
            creatorWallet: metadata.creatorWallet,
            onChainProjectId: metadata.onChainProjectId,
            amountSol,
            beneficiary: metadata.beneficiary || null,
            kiraPaymentCode: code,
          }),
        }
      );

      const relayResult = await relayResponse.json();

      if (!relayResult.success) {
        console.error('[v0] Relay funding failed:', relayResult.error);
        return NextResponse.json(
          { error: 'On-chain funding failed', details: relayResult.error },
          { status: 500 }
        );
      }

      console.log('[v0] KiraPay payment funded on-chain:', relayResult.signature);
      return NextResponse.json({
        success: true,
        signature: relayResult.signature
      });
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
