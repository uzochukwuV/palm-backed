import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Program ID - replace with your deployed program ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || 
  "11111111111111111111111111111111" // Placeholder - replace with actual program ID
);

// Treasury address from the smart contract
export const TREASURY = new PublicKey(
  "37x9AGp1ipgNfGbuoEVxQtjT5RJnJss6pT3V49TDnm5p"
);

// Instruction discriminators
const INSTRUCTION_INITIALIZE = 0;
const INSTRUCTION_FUND = 1;
const INSTRUCTION_WITHDRAW = 2;

// Asset types
const ASSET_SOL = 0;
const ASSET_SPL = 1;

// ProjectState structure size
export const PROJECT_STATE_LEN = 32 + 1 + 32 + 8 + 8 + 8 + 8 + 1 + 1; // 99 bytes

export interface ProjectState {
  creator: PublicKey;
  assetKind: number;
  mint: PublicKey;
  projectId: bigint;
  budgetAmount: bigint;
  deadlineUnixTs: bigint;
  totalFunded: bigint;
  vaultBump: number;
  stateBump: number;
}

/**
 * Derive the project state PDA
 */
export function deriveStatePda(
  programId: PublicKey,
  creator: PublicKey,
  projectId: bigint
): [PublicKey, number] {
  const projectIdBuffer = Buffer.alloc(8);
  projectIdBuffer.writeBigUInt64LE(projectId);
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), creator.toBuffer(), projectIdBuffer],
    programId
  );
}

/**
 * Derive the vault authority PDA
 */
export function deriveVaultAuthority(
  programId: PublicKey,
  statePda: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), statePda.toBuffer()],
    programId
  );
}

/**
 * Parse ProjectState from account data
 */
export function parseProjectState(data: Buffer): ProjectState {
  let offset = 0;
  
  const creator = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  const assetKind = data.readUInt8(offset);
  offset += 1;
  
  const mint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  
  const projectId = data.readBigUInt64LE(offset);
  offset += 8;
  
  const budgetAmount = data.readBigUInt64LE(offset);
  offset += 8;
  
  const deadlineUnixTs = data.readBigInt64LE(offset);
  offset += 8;
  
  const totalFunded = data.readBigUInt64LE(offset);
  offset += 8;
  
  const vaultBump = data.readUInt8(offset);
  offset += 1;
  
  const stateBump = data.readUInt8(offset);
  
  return {
    creator,
    assetKind,
    mint,
    projectId,
    budgetAmount,
    deadlineUnixTs,
    totalFunded,
    vaultBump,
    stateBump,
  };
}

/**
 * Create InitializeProject instruction data
 */
function createInitializeData(
  assetKind: number,
  mint: PublicKey,
  projectId: bigint,
  budgetAmount: bigint,
  deadlineUnixTs: bigint
): Buffer {
  const buffer = Buffer.alloc(1 + 1 + 32 + 8 + 8 + 8); // 58 bytes
  let offset = 0;
  
  buffer.writeUInt8(INSTRUCTION_INITIALIZE, offset);
  offset += 1;
  
  buffer.writeUInt8(assetKind, offset);
  offset += 1;
  
  mint.toBuffer().copy(buffer, offset);
  offset += 32;
  
  buffer.writeBigUInt64LE(projectId, offset);
  offset += 8;
  
  buffer.writeBigUInt64LE(budgetAmount, offset);
  offset += 8;
  
  buffer.writeBigInt64LE(deadlineUnixTs, offset);
  
  return buffer;
}

/**
 * Create Fund instruction data
 */
function createFundData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(1 + 8); // 9 bytes
  buffer.writeUInt8(INSTRUCTION_FUND, 0);
  buffer.writeBigUInt64LE(amount, 1);
  return buffer;
}

/**
 * Create Withdraw instruction data
 */
function createWithdrawData(): Buffer {
  const buffer = Buffer.alloc(1);
  buffer.writeUInt8(INSTRUCTION_WITHDRAW, 0);
  return buffer;
}

/**
 * Initialize a new SOL funding project on-chain
 */
export async function initializeProject(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint,
  budgetAmountSol: number,
  deadlineUnixTs: number
): Promise<Transaction> {
  const budgetAmount = BigInt(Math.floor(budgetAmountSol * LAMPORTS_PER_SOL));
  const deadline = BigInt(deadlineUnixTs);
  
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);
  
  const data = createInitializeData(
    ASSET_SOL,
    PublicKey.default, // No mint for SOL
    projectId,
    budgetAmount,
    deadline
  );
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = creator;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  return transaction;
}

/**
 * Fund an existing SOL project
 */
export async function fundProject(
  connection: Connection,
  funder: PublicKey,
  creator: PublicKey,
  projectId: bigint,
  amountSol: number
): Promise<Transaction> {
  const amount = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);
  
  const data = createFundData(amount);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: funder, isSigner: true, isWritable: true },
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = funder;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  return transaction;
}

/**
 * Withdraw funds from a completed SOL project (creator only)
 */
export async function withdrawFunds(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint
): Promise<Transaction> {
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);
  
  const data = createWithdrawData();
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = creator;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  return transaction;
}

/**
 * Fetch and parse on-chain project state
 */
export async function getProjectState(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint
): Promise<ProjectState | null> {
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  
  const accountInfo = await connection.getAccountInfo(statePda);
  if (!accountInfo) {
    return null;
  }
  
  return parseProjectState(accountInfo.data);
}

/**
 * Get vault balance for a project
 */
export async function getVaultBalance(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint
): Promise<number> {
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);
  
  const balance = await connection.getBalance(vaultPda);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}
