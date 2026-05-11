# Kira Pay Integration Library

This directory contains the Kira Pay API client and server actions for cross-chain payment integration.

## Files

### `client.ts`
The Kira Pay API client with methods for:
- `createPaymentLink()` - Create a new payment link
- `getPaymentLinks()` - Get all payment links
- `getPaymentLinkByCode()` - Get a specific payment link
- `createOrUpdateWebhook()` - Set up webhook notifications
- `getWebhook()` - Get webhook configuration
- `getWalletTransactions()` - Get transaction history

### `actions.ts`
Server actions for payment operations:
- `createKiraPaymentLink()` - Create a payment link for a project
- `getPaymentLinkStatus()` - Check payment status
- `setupKiraPayWebhook()` - Configure webhook (one-time setup)
- `recordKiraPayContribution()` - Record a successful contribution

## Usage

### Create a Payment Link

```typescript
import { createKiraPaymentLink } from '@/lib/kira-pay/actions';

const result = await createKiraPaymentLink({
  projectId: 'project-123',
  projectTitle: 'My Awesome Project',
  amount: 100,
  currency: 'USDC',
  backerEmail: 'backer@example.com',
});

if (result.success) {
  // Open payment link
  window.open(result.paymentLink.url, '_blank');
}
```

### Check Payment Status

```typescript
import { getPaymentLinkStatus } from '@/lib/kira-pay/actions';

const result = await getPaymentLinkStatus('payment_code_123');
if (result.success) {
  console.log('Payment status:', result.status);
}
```

### Setup Webhook (Backend Only)

```typescript
import { setupKiraPayWebhook } from '@/lib/kira-pay/actions';

await setupKiraPayWebhook(
  'https://your-domain.com/api/webhooks/kira-pay'
);
```

## Environment Variables

Required:
- `KIRA_PAY_API_KEY` - Your Kira Pay API key

Optional:
- `KIRA_PAY_WEBHOOK_URL` - Webhook URL for payment notifications
- `KIRA_PAY_BACKEND_WALLET` - Backend wallet address for deposits
- `NEXT_PUBLIC_APP_URL` - Your app's base URL (for redirects)

## API Response Format

### Payment Link Response

```typescript
{
  code: string;           // Unique payment link code
  url: string;            // Payment link URL
  amount: number;         // Payment amount
  currency: string;       // USDC, USDT, PUSD, etc
  status: string;         // pending, completed, failed
  createdAt: string;      // ISO timestamp
}
```

### Transaction Response

```typescript
{
  id: string;             // Transaction ID
  amount: number;         // Amount
  currency: string;       // Currency
  status: string;         // completed, pending, failed
  transactionHash: string;// Blockchain tx hash
  timestamp: string;      // ISO timestamp
  metadata: object;       // Custom data
}
```

## Error Handling

All functions return standardized responses:

```typescript
{
  success: boolean;
  error?: string;         // Error message if failed
  data?: any;             // Data if successful
}
```

## Webhook Events

The webhook system handles these events:
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.pending` - Payment in progress
- `refund.initiated` - Refund started

## Integration Points

### Frontend
- `PaymentMethodSelector` component for user choice
- Links to Kira Pay in `FundProjectDialog`

### Backend
- Webhook receiver at `/api/webhooks/kira-pay`
- Contribution recorder for successful payments

### Database
- Contributions table stores payment method and Kira code
- Projects table tracks total funding from all sources

## Security

- All API calls include Bearer token authentication
- Webhook signatures should be verified (implement in webhook handler)
- Sensitive data (amount, user info) is in webhook metadata
- Never log or expose API keys

## Testing

To test the integration:

1. Set `KIRA_PAY_API_KEY` in your environment
2. Create a test payment link
3. Verify the link is accessible
4. Simulate webhook with test data
5. Verify contribution is recorded

## Documentation

See `/docs/KIRA_PAY_INTEGRATION.md` for full setup and architecture details.
