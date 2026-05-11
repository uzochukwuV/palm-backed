# Relay Wallet Setup & Security Guide

## Overview

The relay wallet system allows the platform to sponsor transaction fees for users and handle cross-chain payments via KiraPay. This document covers setup, security considerations, and production deployment.

## Features

1. **Sponsored Project Creation**: Relay wallet pays for project initialization transaction fees
2. **Cross-Chain Funding**: Relay wallet receives KiraPay webhooks and funds projects on-chain on behalf of cross-chain users
3. **Refund Support**: Relay wallet can process refunds for KiraPay-backed contributions

## Setup Instructions

### 1. Generate Relay Wallet (Devnet)

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate a new keypair for devnet
solana-keygen new --outfile ~/.config/solana/relay-wallet-devnet.json

# Get the public key
solana-keygen pubkey ~/.config/solana/relay-wallet-devnet.json

# Fund it with devnet SOL
solana airdrop 2 <PUBLIC_KEY> --url devnet
```

### 2. Convert to Base58 for Environment Variable

```bash
# Get base58 encoded private key
cat ~./wallet-keypair.json | jq -r '.[0:32] | @base64' | base64 -d | base58
```

### 3. Add to Environment Variables

Create or update `.env.local`:

```env
# Relay Wallet Configuration
RELAY_WALLET_PRIVATE_KEY=<base58_encoded_private_key>

# App URL for webhook callbacks
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Solana RPC endpoints
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://api.mainnet-beta.solana.com
```

## Security Considerations

### ⚠️ CRITICAL: Current Implementation is for HACKATHON/DEMO ONLY

The current implementation stores the private key in an environment variable. **This is NOT secure for production.**

### Production Security Requirements

#### 1. Use AWS KMS or Similar Key Management Service

```typescript
// Example: AWS KMS integration
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kmsClient = new KMSClient({ region: "us-east-1" });

async function signWithKMS(message: Buffer): Promise<Signature> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256",
  });
  
  const response = await kmsClient.send(command);
  return parseSignature(response.Signature);
}
```

#### 2. Implement Rate Limiting

```typescript
// Example: Rate limit relay operations per IP/user
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }
  
  // ... rest of handler
}
```

#### 3. Add Request Signing/Authentication

```typescript
// Verify requests are from your frontend
const signature = request.headers.get("x-relay-signature");
const timestamp = request.headers.get("x-relay-timestamp");

if (!verifySignature(body, signature, timestamp)) {
  return NextResponse.json(
    { error: "Invalid signature" },
    { status: 401 }
  );
}
```

#### 4. Monitor and Alert

- Set up CloudWatch/Datadog alerts for:
  - Unusual transaction volume
  - Failed transactions
  - Low relay wallet balance
  - Unauthorized access attempts

#### 5. Wallet Balance Management

```typescript
// Check relay wallet balance before operations
const balance = await connection.getBalance(relayWallet.publicKey);
const minimumBalance = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

if (balance < minimumBalance) {
  // Alert ops team
  await sendAlert("Relay wallet balance low", { balance });
  
  return NextResponse.json(
    { error: "Service temporarily unavailable" },
    { status: 503 }
  );
}
```

## API Endpoints

### POST /api/relay/init-project

Sponsors project initialization transaction fees.

**Request:**
```json
{
  "projectId": "uuid",
  "creatorWallet": "base58_pubkey",
  "budgetSol": 10.0,
  "deadlineUnixTs": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "signature": "transaction_signature",
  "relayWallet": "relay_wallet_pubkey"
}
```

### POST /api/relay/fund-project

Funds a project on-chain (called by KiraPay webhook).

**Request:**
```json
{
  "projectId": "uuid",
  "creatorWallet": "base58_pubkey",
  "onChainProjectId": "12345",
  "amountSol": 1.0,
  "beneficiary": "beneficiary_pubkey",
  "kiraPaymentCode": "kira_code"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "transaction_signature",
  "relayWallet": "relay_wallet_pubkey",
  "beneficiary": "beneficiary_pubkey"
}
```

## Testing

### Test Relay Init Project

```bash
curl -X POST http://localhost:3000/api/relay/init-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-uuid",
    "creatorWallet": "YOUR_WALLET_PUBKEY",
    "budgetSol": 1.0,
    "deadlineUnixTs": 1735689600
  }'
```

### Test Relay Fund Project

```bash
curl -X POST http://localhost:3000/api/relay/fund-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-uuid",
    "creatorWallet": "CREATOR_WALLET",
    "onChainProjectId": "12345",
    "amountSol": 0.1,
    "beneficiary": "BENEFICIARY_WALLET",
    "kiraPaymentCode": "test-code"
  }'
```

## Deployment Checklist

- [ ] Generate production relay wallet with KMS
- [ ] Set up rate limiting (Upstash Redis or similar)
- [ ] Implement request signing/authentication
- [ ] Configure monitoring and alerts
- [ ] Set up automatic wallet funding
- [ ] Test all endpoints on devnet
- [ ] Audit smart contract integration
- [ ] Review and test refund flow
- [ ] Document incident response procedures
- [ ] Set up backup relay wallet

## Cost Estimation

### Transaction Costs (Devnet/Mainnet)

- Project initialization: ~0.002 SOL
- Funding transaction: ~0.000005 SOL
- Refund transaction: ~0.000005 SOL

### Monthly Estimates (100 projects, 1000 contributions)

- Init costs: 100 × 0.002 = 0.2 SOL
- Funding costs: 1000 × 0.000005 = 0.005 SOL
- **Total: ~0.21 SOL/month (~$5-10 USD depending on SOL price)**

## Support

For issues or questions:
- Check logs in `/api/relay/*` endpoints
- Verify relay wallet balance
- Confirm environment variables are set
- Test on devnet first

## License

This relay wallet system is part of the Backed platform and follows the same license.