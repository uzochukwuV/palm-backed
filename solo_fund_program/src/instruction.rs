use solana_program::{program_error::ProgramError, pubkey::Pubkey};

use crate::error::EscrowError;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Asset {
    Sol,
    Spl { mint: Pubkey },
}

pub enum EscrowInstruction {
    /// Accounts (SOL): payer, creator, state_pda, vault, system_program
    /// Accounts (SPL): payer, creator, state_pda, vault_authority, vault_ata,
    ///                 mint, token_program, ata_program, system_program
    /// payer and creator must both sign. Pass same key twice if they are equal.
    InitializeProject {
        asset: Asset,
        project_id: u64,
        budget_amount: u64,
        deadline_unix_ts: i64,
    },

    /// Fund a project on behalf of `beneficiary`.
    ///
    /// For direct funders: pass own pubkey as beneficiary.
    /// For relay wallets:  pass the cross-chain user's Solana pubkey as
    ///                     beneficiary; relay wallet is the tx signer.
    ///
    /// Receipt PDA is keyed to beneficiary, not the signer.
    ///
    /// Accounts (SOL): funder/relay, state_pda, vault, receipt_pda, system_program
    /// Accounts (SPL): funder/relay, state_pda, funder_token, vault_authority,
    ///                 vault_ata, receipt_pda, token_program, system_program
    Fund {
        amount: u64,
        /// Real economic owner. For direct funders this equals the signer.
        beneficiary: Pubkey,
    },

    /// Withdraw funds after deadline (creator only, 1% fee to treasury).
    ///
    /// Accounts (SOL): creator, state_pda, vault, treasury, payer
    /// Accounts (SPL): creator, state_pda, vault_authority, vault_ata,
    ///                 creator_ata, treasury_ata, token_program, payer
    Withdraw,

    /// Refund the beneficiary's full contribution before the deadline.
    ///
    /// Authorization:
    ///   - receipt.relay == default  → beneficiary must sign
    ///   - receipt.relay != default  → relay must sign (routes refund cross-chain)
    ///
    /// Accounts (SOL): signer, state_pda, vault, receipt_pda, refund_dest, system_program
    /// Accounts (SPL): signer, state_pda, refund_token, vault_authority,
    ///                 vault_ata, receipt_pda, token_program
    ///
    /// `refund_dest` / `refund_token` is where the tokens land:
    ///   - Direct: beneficiary's wallet / ATA
    ///   - Relay:  relay's wallet / ATA (relay handles cross-chain leg)
    Refund,
}

fn take<'a>(data: &'a [u8], offset: &mut usize, n: usize) -> Result<&'a [u8], ProgramError> {
    let end = offset
        .checked_add(n)
        .ok_or(EscrowError::InvalidInstruction)?;
    if end > data.len() {
        return Err(EscrowError::InvalidInstruction.into());
    }
    let out = &data[*offset..end];
    *offset = end;
    Ok(out)
}

fn read_u8(data: &[u8], offset: &mut usize) -> Result<u8, ProgramError> {
    Ok(take(data, offset, 1)?[0])
}

fn read_u64(data: &[u8], offset: &mut usize) -> Result<u64, ProgramError> {
    let bytes = take(data, offset, 8)?;
    Ok(u64::from_le_bytes(
        bytes
            .try_into()
            .map_err(|_| EscrowError::InvalidInstruction)?,
    ))
}

fn read_i64(data: &[u8], offset: &mut usize) -> Result<i64, ProgramError> {
    let bytes = take(data, offset, 8)?;
    Ok(i64::from_le_bytes(
        bytes
            .try_into()
            .map_err(|_| EscrowError::InvalidInstruction)?,
    ))
}

fn read_pubkey(data: &[u8], offset: &mut usize) -> Result<Pubkey, ProgramError> {
    let bytes = take(data, offset, 32)?;
    Ok(Pubkey::new_from_array(
        bytes
            .try_into()
            .map_err(|_| EscrowError::InvalidInstruction)?,
    ))
}

impl EscrowInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let mut offset = 0usize;
        let tag = read_u8(input, &mut offset)?;
        match tag {
            0 => {
                let asset_kind = read_u8(input, &mut offset)?;
                let mint = read_pubkey(input, &mut offset)?;
                let project_id = read_u64(input, &mut offset)?;
                let budget_amount = read_u64(input, &mut offset)?;
                let deadline_unix_ts = read_i64(input, &mut offset)?;
                let asset = match asset_kind {
                    0 => Asset::Sol,
                    1 => Asset::Spl { mint },
                    _ => return Err(EscrowError::InvalidInstruction.into()),
                };
                Ok(Self::InitializeProject {
                    asset,
                    project_id,
                    budget_amount,
                    deadline_unix_ts,
                })
            }
            // Fund: [1u8][amount: u64 LE][beneficiary: 32 bytes]
            1 => {
                let amount = read_u64(input, &mut offset)?;
                let beneficiary = read_pubkey(input, &mut offset)?;
                Ok(Self::Fund { amount, beneficiary })
            }
            2 => Ok(Self::Withdraw),
            3 => Ok(Self::Refund),
            _ => Err(EscrowError::InvalidInstruction.into()),
        }
    }
}
