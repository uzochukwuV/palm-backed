# Kira Pay Integration Guide

This document outlines the Kira Pay cross-chain payment integration for the Backed platform.

## Overview

Kira Pay enables users to fund projects from any blockchain (Ethereum, Polygon, etc.) seamlessly. The integration works as follows:

1. **User Selection**: User chooses between direct Solana payment or cross-chain via Kira Pay
2. **Payment Link Generation**: A Kira Pay payment link is created with project metadata
3. **Cross-Chain Bridge**: User funds from their blockchain of choice
4. **Webhook Notification**: Kira Pay notifies the backend when payment is confirmed
5. **On-Chain Deposit**: Backend node deposits funds into the project vault on Solana

## Architecture

```
┌─────────────────┐
│   User          │
│ (Any Blockchain)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│   Kira Pay      │────────▶│  Backend Node    │
│ (Payment Link)  │ Webhook │ (Deposit Funds)  │
└─────────────────┘         └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Solana Chain    │
                            │ (Project Vault)  │
                            └──────────────────┘
```

## Setup Instructions

### 1. Get Kira Pay API Key

1. Go to https://dashboard.kira-pay.com
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key to your environment variables

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
KIRA_PAY_API_KEY=your_api_key_here
KIRA_PAY_WEBHOOK_URL=https://your-domain.com/api/webhooks/kira-pay
KIRA_PAY_BACKEND_WALLET=your_backend_solana_address
```

### 3. Deploy Backend Node (Future)

When the off-chain backend node is ready:

1. Set up the node to listen to webhook notifications
2. Configure it to deposit funds to the project vault
3. Update `KIRA_PAY_BACKEND_WALLET` with the node's Solana address

### 4. Test Payment Flow

1. Go to a project page
2. Click "Back this project"
3. Select "Cross-Chain (Kira Pay)"
4. Complete payment through Kira Pay interface
5. Verify webhook is received at `/api/webhooks/kira-pay`

## API Integration Points

### Client-Side

```typescript
// In payment method selector
import { PaymentMethodSelector } from '@/components/solana/payment-method-selector'

// User can choose 'solana' or 'crosschain'
```

### Server-Side

```typescript
// Create payment link
import { createKiraPaymentLink } from '@/lib/kira-pay/actions'

const result = await createKiraPaymentLink({
  projectId: 'project-123',
  projectTitle: 'My Project',
  amount: 100,
  currency: 'USDC',
})
```

### Webhook Handler

Endpoint: `POST /api/webhooks/kira-pay`

Receives events for:
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.pending` - Payment in progress

## Database Schema

The `contributions` table should include:

```sql
ALTER TABLE contributions ADD COLUMN (
  payment_method VARCHAR(50), -- 'solana' or 'kira-pay'
  kira_payment_code VARCHAR(255), -- Kira Pay payment link code
  currency VARCHAR(10) -- USDC, USDT, PUSD, etc
);
```

## Backend Node Implementation

The off-chain backend node should:

1. **Listen to Webhooks**: Receive payment confirmations from Kira Pay
2. **Verify Signatures**: Validate webhook authenticity
3. **Deposit Funds**: Call the smart contract to deposit funds
4. **Error Handling**: Retry on failure and notify admins

Example flow:

```typescript
// Pseudo-code for backend node
async function handleKiraPayment(webhookData) {
  // 1. Verify Kira Pay signature
  if (!verifyKiraSignature(webhookData)) {
    throw new Error('Invalid signature');
  }

  // 2. Check payment status
  if (webhookData.status !== 'completed') {
    return;
  }

  // 3. Get project and amount
  const { projectId, amount } = webhookData.metadata;

  // 4. Call Solana smart contract
  const tx = await fundProject(
    projectId,
    amount,
    BACKEND_WALLET_KEYPAIR
  );

  // 5. Notify frontend of success
  await updateContributionOnChain(
    projectId,
    tx.signature
  );
}
```

## Security Considerations

### Webhook Verification

Always verify webhook signatures in production:

```typescript
import crypto from 'crypto';

function verifyKiraSignature(payload, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hmac === signature;
}
```

### Amount Validation

Always validate amounts match user intent:

```typescript
// Ensure amount doesn't exceed user's intent
if (webhookAmount > expectedAmount * 1.01) {
  throw new Error('Payment amount exceeds expected');
}
```

### Wallet Security

- Never expose the backend wallet's private key
- Use hardware wallet or Solana key management service
- Implement rate limiting on deposit endpoint
- Use transaction memos to track payments

## Error Handling

The integration includes error handling for:

- Missing API credentials
- Network failures
- Invalid payment amounts
- Duplicate payments
- Webhook signature failures

Errors are logged with context for debugging.

## Monitoring

Monitor these metrics:

- Payment success rate
- Average payment confirmation time
- Webhook delivery failures
- Failed deposit transactions

## Future Enhancements

- [ ] Support for more stablecoins
- [ ] Batch processing of multiple payments
- [ ] Real-time payment status updates via WebSocket
- [ ] Multi-sig wallet support for security
- [ ] Automatic retry logic for failed deposits
- [ ] Payment analytics dashboard

## Support

For Kira Pay API support: https://docs.kira-pay.com
For issues with this integration: [Your support URL]
