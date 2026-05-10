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

// Devnet deployment supplied after the program was deployed.
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID ||
    "4bP1AsitGdrAnXUYuwdrEJsxoFML8Zpg4VQH3dPoMKnr"
);

export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";

export const SOLANA_EXPLORER_CLUSTER =
  SOLANA_NETWORK === "mainnet-beta" ? "" : `?cluster=${SOLANA_NETWORK}`;

// Treasury address from the smart contract.
export const TREASURY = new PublicKey(
  "37x9AGp1ipgNfGbuoEVxQtjT5RJnJss6pT3V49TDnm5p"
);

// Instruction discriminators from solo_fund_program/src/instruction.rs.
const INSTRUCTION_INITIALIZE = 0;
const INSTRUCTION_FUND = 1;
const INSTRUCTION_WITHDRAW = 2;

// Asset types from solo_fund_program/src/instruction.rs.
const ASSET_SOL = 0;

// ProjectState structure size from solo_fund_program/src/state.rs.
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

/**
 * Derive a stable u64 project id from a Supabase UUID.
 */
export function uuidToProjectId(uuid: string): bigint {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("Project id must be a UUID");
  }

  return BigInt(`0x${hex.slice(0, 16)}`);
}

/**
 * Derive the project state PDA.
 */
export function deriveStatePda(
  programId: PublicKey,
  creator: PublicKey,
  projectId: bigint
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), creator.toBuffer(), u64Le(projectId)],
    programId
  );
}

/**
 * Derive the SOL vault PDA / SPL vault authority PDA.
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
 * Parse ProjectState from account data.
 */
export function parseProjectState(data: Uint8Array): ProjectState {
  if (data.length < PROJECT_STATE_LEN) {
    throw new Error("Invalid project state account size");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const creator = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const assetKind = view.getUint8(offset);
  offset += 1;

  const mint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const projectId = view.getBigUint64(offset, true);
  offset += 8;

  const budgetAmount = view.getBigUint64(offset, true);
  offset += 8;

  const deadlineUnixTs = view.getBigInt64(offset, true);
  offset += 8;

  const totalFunded = view.getBigUint64(offset, true);
  offset += 8;

  const vaultBump = view.getUint8(offset);
  offset += 1;

  const stateBump = view.getUint8(offset);

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
 * Create InitializeProject instruction data for SOL projects.
 */
function createInitializeData(
  projectId: bigint,
  budgetAmount: bigint,
  deadlineUnixTs: bigint
): Uint8Array {
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

/**
 * Create Fund instruction data.
 */
function createFundData(amount: bigint): Uint8Array {
  const buffer = new Uint8Array(1 + 8);
  buffer[0] = INSTRUCTION_FUND;
  buffer.set(u64Le(amount), 1);
  return buffer;
}

/**
 * Create Withdraw instruction data.
 */
function createWithdrawData(): Uint8Array {
  return new Uint8Array([INSTRUCTION_WITHDRAW]);
}

async function buildTransaction(
  connection: Connection,
  feePayer: PublicKey,
  instruction: TransactionInstruction
): Promise<Transaction> {
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = feePayer;

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  return transaction;
}

/**
 * Initialize a new SOL funding project on-chain.
 */
export async function initializeProject(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint,
  budgetAmountSol: number,
  deadlineUnixTs: number
): Promise<Transaction> {
  const budgetAmount = solToLamports(budgetAmountSol);
  const deadline = BigInt(deadlineUnixTs);

  if (budgetAmount <= BigInt(0)) {
    throw new Error("Budget must be greater than 0 SOL");
  }

  if (deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("Deadline must be in the future");
  }

  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(createInitializeData(projectId, budgetAmount, deadline)),
  });

  return buildTransaction(connection, creator, instruction);
}

/**
 * Fund an existing SOL project.
 */
export async function fundProject(
  connection: Connection,
  funder: PublicKey,
  creator: PublicKey,
  projectId: bigint,
  amountSol: number
): Promise<Transaction> {
  const amount = solToLamports(amountSol);

  if (amount <= BigInt(0)) {
    throw new Error("Contribution must be greater than 0 SOL");
  }

  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: funder, isSigner: true, isWritable: true },
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(createFundData(amount)),
  });

  return buildTransaction(connection, funder, instruction);
}

/**
 * Withdraw funds from a completed SOL project (creator only).
 */
export async function withdrawFunds(
  connection: Connection,
  creator: PublicKey,
  projectId: bigint
): Promise<Transaction> {
  const [statePda] = deriveStatePda(PROGRAM_ID, creator, projectId);
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, statePda);

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
    data: Buffer.from(createWithdrawData()),
  });

  return buildTransaction(connection, creator, instruction);
}

/**
 * Fetch and parse on-chain project state.
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
 * Get vault balance for a project.
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
 * Convert lamports to SOL.
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports.
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}
