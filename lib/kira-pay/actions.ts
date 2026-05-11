'use server';

import { kiraPayClient, type KiraPaymentLinkParams } from './client';
import { createClient } from '@/lib/supabase/server';

/**
 * Create a payment link for cross-chain funding
 * This is called when user selects the Kira Pay option
 */
export async function createKiraPaymentLink(params: {
  projectId: string;
  projectTitle: string;
  amount: number;
  currency: 'USDC' | 'USDT' | 'PUSD';
  backerEmail?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Create payment link parameters
    const paymentLinkParams: KiraPaymentLinkParams = {
      amount: params.amount,
      currency: params.currency,
      description: `Support for "${params.projectTitle}" on Backed`,
      email: params.backerEmail || user.email || undefined,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/project/${params.projectId}?funded=true`,
      metadata: {
        projectId: params.projectId,
        projectTitle: params.projectTitle,
        backerId: user.id,
        backerEmail: user.email,
        backerWallet: user.user_metadata?.solana_wallet,
        type: 'project-funding',
      },
    };

    // Create the payment link via Kira Pay API
    const paymentLink = await kiraPayClient.createPaymentLink(paymentLinkParams);

    return {
      success: true,
      paymentLink: {
        code: paymentLink.code,
        url: paymentLink.url,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
      },
    };
  } catch (error) {
    console.error('[v0] Failed to create Kira Pay payment link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment link',
    };
  }
}

/**
 * Get payment link by code
 * Used to check payment status
 */
export async function getPaymentLinkStatus(code: string) {
  try {
    const paymentLink = await kiraPayClient.getPaymentLinkByCode(code);

    return {
      success: true,
      status: paymentLink.status,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
    };
  } catch (error) {
    console.error('[v0] Failed to get payment link status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment status',
    };
  }
}

/**
 * Setup webhook for payment notifications
 * This should be called once during backend setup
 */
export async function setupKiraPayWebhook(webhookUrl: string) {
  try {
    // Verify webhook URL is configured
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    const result = await kiraPayClient.createOrUpdateWebhook({
      url: webhookUrl,
      events: [
        'payment.completed',
        'payment.failed',
        'payment.pending',
        'refund.initiated',
      ],
    });

    return {
      success: true,
      webhookId: result.id,
      webhookUrl: result.url,
    };
  } catch (error) {
    console.error('[v0] Failed to setup Kira Pay webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to setup webhook',
    };
  }
}

/**
 * Record a cross-chain contribution
 * This is called from the webhook when payment is confirmed
 */
export async function recordKiraPayContribution(params: {
  projectId: string;
  backerId: string;
  amount: number;
  currency: string;
  kiraPaymentCode: string;
  transactionHash?: string;
}) {
  try {
    const supabase = await createClient();

    // Insert contribution record
    const { error: insertError } = await supabase
      .from('contributions')
      .insert({
        project_id: params.projectId,
        backer_id: params.backerId,
        amount: params.amount,
        payment_method: 'kira-pay',
        kira_payment_code: params.kiraPaymentCode,
        transaction_signature: params.transactionHash,
      });

    if (insertError) {
      throw insertError;
    }

    // Update project funding totals
    const { data: project } = await supabase
      .from('projects')
      .select('current_funding, on_chain_total_funded, backer_count')
      .eq('id', params.projectId)
      .single();

    if (project) {
      const newTotal = (project.current_funding || 0) + params.amount;
      await supabase
        .from('projects')
        .update({
          current_funding: newTotal,
          on_chain_total_funded: newTotal,
          backer_count: (project.backer_count || 0) + 1,
        })
        .eq('id', params.projectId);
    }

    return { success: true };
  } catch (error) {
    console.error('[v0] Failed to record Kira Pay contribution:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record contribution',
    };
  }
}
