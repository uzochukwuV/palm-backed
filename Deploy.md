cd /workspaces/palm-backed && bash -lc 'source ~/.bashrc && cd solo_fund_program && solana program deploy --keypair wallet-keypair.json --url https://api.devnet.solana.com target/deploy/solo_fund_program.so'


Preparing the devnet deployment wallet and airdropping funds so we can deploy the contract there.

Ran terminal command:  cd /workspaces/palm-backed && bash -lc 'source ~/.bashrc && cd solo_fund_program && PUBKEY=$(solana-keygen pubkey wallet-keypair.json) && echo devnet pubkey=$PUBKEY && solana balance --keypair wallet-keypair.json --url https://api.devnet.solana.com && solana airdrop 2 --keypair wallet-keypair.json --url https://api.devnet.solana.com && solana balance --keypair wallet-keypair.json --url https://api.devnet.solana.com'
Completed with input:  cd /workspaces/palm-backed && bash -lc 'source ~/.bashrc && cd solo_fund_program && PUBKEY=$(solana-keygen pubkey wallet-keypair.json) && echo devnet pubkey=$PUBKEY && solana balance --keypair wallet-keypair.json --url https://api.devnet.solana.com && solana airdrop 2 --keypair wallet-keypair.json --url https://api.devnet.solana.com && solana balance --keypair wallet-keypair.json --url https://api.devnet.solana.com'

The devnet wallet already has enough SOL, so proceeding with deploy now.

Ran terminal command:  cd /workspaces/palm-backed && bash -lc 'source ~/.bashrc && cd solo_fund_program && solana program deploy --keypair wallet-keypair.json --url https://api.devnet.solana.com target/deploy/solo_fund_program.so'

✅ Deployed to Solana devnet successfully.

- Program ID: `3bvDjnbgsJdsFHRGzzwZVn5maCmEhkBKr7mF2Y7aFCwi`
- Deployment wallet: `CQo288BpXcPC1iHCa3Bb7DPfJFBMGzCJc7BeZkUb1dwZ`
- Network: `https://api.devnet.solana.com`

If you want, I can next update the frontend to use this devnet program ID and add relay-aware fund/refund support.