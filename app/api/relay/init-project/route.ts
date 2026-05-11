import { NextRequest, NextResponse } from 'next/server';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { PROGRAM_ID, SOLANA_NETWORK } from '@/lib/solana/program';
import bs58 from 'bs58';

// SECURITY WARNING: For hackathon/demo only
// Production should use AWS KMS or similar secure key management
const RELAY_WALLET_PRIVATE_KEY = process.env.RELAY_WALLET_PRIVATE_KEY;

if (!RELAY_WALLET_PRIVATE_KEY) {
  console.warn('⚠️  RELAY_WALLET_PRIVATE_KEY not set - relay gas feature will not work');
}

// Helper functions from program.ts
function u64Le(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function i64Le(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, value, true);
  return bytes;
}

function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1000000000));
}

function uuidToProjectId(uuid: string): bigint {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("Project id must be a UUID");
  }
  return BigInt(`0x${hex.slice(0, 16)}`);
}

function deriveStatePda(
  programId: PublicKey,
  creator: PublicKey,
  projectId: bigint
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), creator.toBuffer(), u64Le(projectId)],
    programId
  );
}

function deriveVaultAuthority(
  programId: PublicKey,
  statePda: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), statePda.toBuffer()],
    programId
  );
}

function createInitializeData(
  projectId: bigint,
  budgetAmount: bigint,
  deadlineUnixTs: bigint
): Uint8Array {
  const INSTRUCTION_INITIALIZE = 0;
  const ASSET_SOL = 0;
  
  const buffer = new Uint8Array(1 + 1 + 32 + 8 + 8 + 8);
  let offset = 0;

  buffer[offset] = INSTRUCTION_INITIALIZE;
  offset += 1;

  buffer[offset] = ASSET_SOL;
  offset += 1;

  PublicKey.default.toBuffer().copy(buffer, offset);
  offset += 32;

  buffer.set(u64Le(projectId), offset);
  offset += 8;

  buffer.set(u64Le(budgetAmount), offset);
  offset += 8;

  buffer.set(i64Le(deadlineUnixTs), offset);

  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    if (!RELAY_WALLET_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Relay wallet not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { projectId, creatorWallet, budgetSol, deadlineUnixTs } = body;

    if (!projectId || !creatorWallet || !budgetSol || !deadlineUnixTs) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize connection
    const endpoint = SOLANA_NETWORK === 'mainnet-beta'
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com'
      : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
    
    const connection = new Connection(endpoint, 'confirmed');

    // Load relay wallet
    const relayKeypair = Keypair.fromSecretKey(bs58.decode(RELAY_WALLET_PRIVATE_KEY));
    const creator = new PublicKey(creatorWallet);

    // Convert project UUID to on-chain ID
    const onChainProjectId = uuidToProjectId(projectId);
    const budgetAmount = solToLamports(budgetSol);
    const deadline = BigInt(deadlineUnixTs);

    // Derive PDAs
    const [statePda] = deriveStatePda(PROGRAM_ID, creator, onChainProjectId);
    const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);

    // Create instruction
    // Smart contract expects: payer, creator, state_pda, vault, system_program, rent
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: relayKeypair.publicKey, isSigner: true, isWritable: true }, // payer (relay wallet)
        { pubkey: creator, isSigner: true, isWritable: true },                 // creator (user wallet)
        { pubkey: statePda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.from(createInitializeData(onChainProjectId, budgetAmount, deadline)),
    });

    // Build transaction with relay wallet as fee payer
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = relayKeypair.publicKey;

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Relay wallet signs as fee payer
    // Note: Do NOT use setSigners() - it's deprecated and can overwrite signatures
    // The feePayer assignment already establishes relay as the fee payer
    // Creator will sign on the frontend
    transaction.partialSign(relayKeypair);

    console.log('Transaction signatures after relay sign:', transaction.signatures.map(s => ({
      pubkey: s.publicKey?.toBase58(),
      signature: s.signature ? 'present' : 'null'
    })));

    // Serialize for creator to sign (preserves existing signatures)
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    return NextResponse.json({
      success: true,
      transaction: serializedTransaction,
      message: 'Transaction prepared. Please sign with your wallet.',
      relayWallet: relayKeypair.publicKey.toBase58(),
      creatorMustSign: creator.toBase58(),
    });

  } catch (error) {
    console.error('Relay init-project error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Made with Bob
