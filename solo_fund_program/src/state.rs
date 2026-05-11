use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct ProjectState {
    pub creator: [u8; 32],
    /// The account that paid rent for state + vault (may equal creator).
    pub payer: [u8; 32],
    pub asset_kind: u8,
    pub mint: [u8; 32],
    pub project_id: u64,
    pub budget_amount: u64,
    pub deadline_unix_ts: i64,
    pub total_funded: u64,
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl ProjectState {
    // 32 (creator) + 32 (payer) + 1 (asset_kind) + 32 (mint) + 8 (project_id)
    // + 8 (budget_amount) + 8 (deadline) + 8 (total_funded) + 1 (vault_bump) + 1 (state_bump)
    pub const LEN: usize = 131;
}

/// Per-funder receipt PDA: ["receipt", state_pda, funder]
/// Tracks how much a funder has contributed so they can be fully refunded.
#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct ReceiptState {
    /// The state PDA this receipt belongs to.
    pub state_pda: [u8; 32],
    /// The funder who owns this receipt.
    pub funder: [u8; 32],
    /// Cumulative amount funded (lamports for SOL, token units for SPL).
    pub amount: u64,
    pub bump: u8,
}

impl ReceiptState {
    // 32 (state_pda) + 32 (funder) + 8 (amount) + 1 (bump)
    pub const LEN: usize = 73;
}
