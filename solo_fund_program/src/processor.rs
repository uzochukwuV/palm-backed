use std::str::FromStr;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use solana_system_interface::instruction as system_instruction;
use spl_associated_token_account::get_associated_token_address;
use spl_token::state::Account as TokenAccount;

use crate::{
    error::EscrowError,
    instruction::{Asset, EscrowInstruction},
    state::{ProjectState, ReceiptState},
};

const TREASURY_STR: &str = "37x9AGp1ipgNfGbuoEVxQtjT5RJnJss6pT3V49TDnm5p";
const WHITELIST_MINTS: [&str; 1] = ["4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"];

fn treasury_pubkey() -> Pubkey {
    Pubkey::from_str(TREASURY_STR).unwrap()
}

fn is_whitelisted_mint(mint: &Pubkey) -> bool {
    WHITELIST_MINTS
        .iter()
        .any(|s| Pubkey::from_str(s).ok().as_ref() == Some(mint))
}

fn derive_state_pda(program_id: &Pubkey, creator: &Pubkey, project_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"project", creator.as_ref(), &project_id.to_le_bytes()],
        program_id,
    )
}

fn derive_vault_authority(program_id: &Pubkey, state_pda: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault", state_pda.as_ref()], program_id)
}

fn derive_receipt_pda(
    program_id: &Pubkey,
    state_pda: &Pubkey,
    funder: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"receipt", state_pda.as_ref(), funder.as_ref()],
        program_id,
    )
}

/// Closes `account` by moving all lamports to `destination` and zeroing data.
fn close_account<'a>(account: &AccountInfo<'a>, destination: &AccountInfo<'a>) -> ProgramResult {
    let lamports = **account.lamports.borrow();
    **account.lamports.borrow_mut() = 0;
    **destination.lamports.borrow_mut() = destination
        .lamports()
        .checked_add(lamports)
        .ok_or(EscrowError::MathOverflow)?;
    account.data.borrow_mut().fill(0);
    Ok(())
}

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let ix = EscrowInstruction::unpack(data)?;
    match ix {
        EscrowInstruction::InitializeProject {
            asset,
            project_id,
            budget_amount,
            deadline_unix_ts,
        } => process_initialize(program_id, accounts, asset, project_id, budget_amount, deadline_unix_ts),
        EscrowInstruction::Fund { amount } => process_fund(program_id, accounts, amount),
        EscrowInstruction::Withdraw => process_withdraw(program_id, accounts),
        EscrowInstruction::Refund => process_refund(program_id, accounts),
    }
}

// ---------------------------------------------------------------------------
// InitializeProject
// ---------------------------------------------------------------------------
// Account order (SOL):  payer, creator, state_pda, vault, system_program
// Account order (SPL):  payer, creator, state_pda, vault_authority, vault_ata,
//                       mint, token_program, ata_program, system_program
//
// If payer == creator the caller simply passes the same account twice.
// payer must be a signer; creator must be a signer.
// ---------------------------------------------------------------------------
fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    asset: Asset,
    project_id: u64,
    budget_amount: u64,
    deadline_unix_ts: i64,
) -> ProgramResult {
    if budget_amount == 0 {
        return Err(EscrowError::InvalidInstruction.into());
    }

    let clock = Clock::get()?;
    if deadline_unix_ts <= clock.unix_timestamp {
        return Err(EscrowError::DeadlineInPast.into());
    }

    match asset {
        Asset::Sol => {
            let mut it = accounts.iter();
            let payer = next_account_info(&mut it)?;
            let creator = next_account_info(&mut it)?;
            let state_info = next_account_info(&mut it)?;
            let vault_info = next_account_info(&mut it)?;
            let system_program = next_account_info(&mut it)?;

            if !payer.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            if !creator.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            if !state_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !vault_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !payer.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if !state_info.data_is_empty() {
                return Err(ProgramError::AccountAlreadyInitialized);
            }
            if !vault_info.data_is_empty() || **vault_info.lamports.borrow() != 0 {
                return Err(ProgramError::AccountAlreadyInitialized);
            }

            let (expected_state, state_bump) = derive_state_pda(program_id, creator.key, project_id);
            if expected_state != *state_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_vault, vault_bump) = derive_vault_authority(program_id, state_info.key);
            if expected_vault != *vault_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let rent = Rent::get()?;
            let state_lamports = rent.minimum_balance(ProjectState::LEN);

            invoke_signed(
                &system_instruction::create_account(
                    payer.key,
                    state_info.key,
                    state_lamports,
                    ProjectState::LEN as u64,
                    program_id,
                ),
                &[payer.clone(), state_info.clone(), system_program.clone()],
                &[&[
                    b"project",
                    creator.key.as_ref(),
                    &project_id.to_le_bytes(),
                    &[state_bump],
                ]],
            )?;

            // Vault seeded with rent-exempt minimum so it survives as a pure
            // lamport sink; we reclaim this on withdraw.
            let vault_rent = rent.minimum_balance(0);
            invoke_signed(
                &system_instruction::create_account(payer.key, vault_info.key, vault_rent, 0, program_id),
                &[payer.clone(), vault_info.clone(), system_program.clone()],
                &[&[b"vault", state_info.key.as_ref(), &[vault_bump]]],
            )?;

            let state = ProjectState {
                creator: creator.key.to_bytes(),
                payer: payer.key.to_bytes(),
                asset_kind: 0,
                mint: Pubkey::default().to_bytes(),
                project_id,
                budget_amount,
                deadline_unix_ts,
                total_funded: 0,
                vault_bump,
                state_bump,
            };
            state.serialize(&mut &mut state_info.data.borrow_mut()[..])?;
            Ok(())
        }
        Asset::Spl { mint } => {
            if !is_whitelisted_mint(&mint) {
                return Err(EscrowError::AssetNotAllowed.into());
            }

            let mut it = accounts.iter();
            let payer = next_account_info(&mut it)?;
            let creator = next_account_info(&mut it)?;
            let state_info = next_account_info(&mut it)?;
            let vault_authority = next_account_info(&mut it)?;
            let vault_ata = next_account_info(&mut it)?;
            let mint_info = next_account_info(&mut it)?;
            let token_program = next_account_info(&mut it)?;
            let ata_program = next_account_info(&mut it)?;
            let system_program = next_account_info(&mut it)?;

            if !payer.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            if !creator.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            if !payer.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !state_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !vault_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if *mint_info.key != mint {
                return Err(EscrowError::InvalidMint.into());
            }
            if *token_program.key != spl_token::id() {
                return Err(ProgramError::IncorrectProgramId);
            }
            if *ata_program.key != spl_associated_token_account::id() {
                return Err(ProgramError::IncorrectProgramId);
            }

            if !state_info.data_is_empty() {
                return Err(ProgramError::AccountAlreadyInitialized);
            }
            if !vault_ata.data_is_empty() {
                return Err(ProgramError::AccountAlreadyInitialized);
            }

            let (expected_state, state_bump) = derive_state_pda(program_id, creator.key, project_id);
            if expected_state != *state_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_vault_authority, vault_bump) =
                derive_vault_authority(program_id, state_info.key);
            if expected_vault_authority != *vault_authority.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let expected_vault_ata = get_associated_token_address(vault_authority.key, &mint);
            if expected_vault_ata != *vault_ata.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let rent = Rent::get()?;
            let state_lamports = rent.minimum_balance(ProjectState::LEN);

            invoke_signed(
                &system_instruction::create_account(
                    payer.key,
                    state_info.key,
                    state_lamports,
                    ProjectState::LEN as u64,
                    program_id,
                ),
                &[payer.clone(), state_info.clone(), system_program.clone()],
                &[&[
                    b"project",
                    creator.key.as_ref(),
                    &project_id.to_le_bytes(),
                    &[state_bump],
                ]],
            )?;

            let create_ata_ix = spl_associated_token_account::instruction::create_associated_token_account(
                payer.key,
                vault_authority.key,
                &mint,
                &spl_token::id(),
            );
            invoke(
                &create_ata_ix,
                &[
                    payer.clone(),
                    vault_ata.clone(),
                    vault_authority.clone(),
                    mint_info.clone(),
                    system_program.clone(),
                    token_program.clone(),
                    ata_program.clone(),
                ],
            )?;

            let state = ProjectState {
                creator: creator.key.to_bytes(),
                payer: payer.key.to_bytes(),
                asset_kind: 1,
                mint: mint.to_bytes(),
                project_id,
                budget_amount,
                deadline_unix_ts,
                total_funded: 0,
                vault_bump,
                state_bump,
            };
            state.serialize(&mut &mut state_info.data.borrow_mut()[..])?;
            Ok(())
        }
    }
}

// ---------------------------------------------------------------------------
// Fund
// ---------------------------------------------------------------------------
fn process_fund(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    if amount == 0 {
        return Err(EscrowError::InvalidInstruction.into());
    }

    let mut it = accounts.iter();
    let funder = next_account_info(&mut it)?;
    if !funder.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if !funder.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }

    let state_info = next_account_info(&mut it)?;
    if !state_info.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }
    let mut state = ProjectState::try_from_slice(&state_info.data.borrow())?;

    let new_total = state
        .total_funded
        .checked_add(amount)
        .ok_or(EscrowError::MathOverflow)?;
    if new_total > state.budget_amount {
        return Err(EscrowError::BudgetExceeded.into());
    }

    let clock = Clock::get()?;
    if clock.unix_timestamp >= state.deadline_unix_ts {
        return Err(EscrowError::FundingClosed.into());
    }

    let creator = Pubkey::new_from_array(state.creator);
    let (expected_state, _) = derive_state_pda(program_id, &creator, state.project_id);
    if expected_state != *state_info.key {
        return Err(EscrowError::InvalidPda.into());
    }

    match state.asset_kind {
        0 => {
            let vault_info = next_account_info(&mut it)?;
            let receipt_info = next_account_info(&mut it)?;
            let system_program = next_account_info(&mut it)?;

            if !vault_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !receipt_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            let (expected_vault, vault_bump) = derive_vault_authority(program_id, state_info.key);
            if expected_vault != *vault_info.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_receipt, receipt_bump) =
                derive_receipt_pda(program_id, state_info.key, funder.key);
            if expected_receipt != *receipt_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            invoke(
                &system_instruction::transfer(funder.key, vault_info.key, amount),
                &[funder.clone(), vault_info.clone(), system_program.clone()],
            )?;

            upsert_receipt(
                program_id,
                funder,
                state_info,
                receipt_info,
                system_program,
                receipt_bump,
                amount,
            )?;
        }
        1 => {
            let funder_token = next_account_info(&mut it)?;
            let vault_authority = next_account_info(&mut it)?;
            let vault_ata = next_account_info(&mut it)?;
            let receipt_info = next_account_info(&mut it)?;
            let token_program = next_account_info(&mut it)?;
            let system_program = next_account_info(&mut it)?;

            if !funder_token.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !vault_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !receipt_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if *token_program.key != spl_token::id() {
                return Err(ProgramError::IncorrectProgramId);
            }

            let mint = Pubkey::new_from_array(state.mint);
            let (expected_vault_authority, vault_bump) =
                derive_vault_authority(program_id, state_info.key);
            let expected_vault_ata = get_associated_token_address(&expected_vault_authority, &mint);

            if *vault_authority.key != expected_vault_authority {
                return Err(EscrowError::InvalidPda.into());
            }
            if *vault_ata.key != expected_vault_ata {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_receipt, receipt_bump) =
                derive_receipt_pda(program_id, state_info.key, funder.key);
            if expected_receipt != *receipt_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let ix = spl_token::instruction::transfer(
                &spl_token::id(),
                funder_token.key,
                vault_ata.key,
                funder.key,
                &[],
                amount,
            )?;
            invoke(
                &ix,
                &[
                    funder_token.clone(),
                    vault_ata.clone(),
                    funder.clone(),
                    token_program.clone(),
                ],
            )?;

            upsert_receipt(
                program_id,
                funder,
                state_info,
                receipt_info,
                system_program,
                receipt_bump,
                amount,
            )?;
        }
        _ => return Err(EscrowError::InvalidInstruction.into()),
    }

    state.total_funded = new_total;
    state.serialize(&mut &mut state_info.data.borrow_mut()[..])?;
    Ok(())
}

/// Creates the receipt PDA on first fund, or tops up the amount on subsequent funds.
fn upsert_receipt<'a>(
    program_id: &Pubkey,
    funder: &AccountInfo<'a>,
    state_info: &AccountInfo<'a>,
    receipt_info: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    receipt_bump: u8,
    amount: u64,
) -> ProgramResult {
    if receipt_info.data_is_empty() {
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(ReceiptState::LEN);
        invoke_signed(
            &system_instruction::create_account(
                funder.key,
                receipt_info.key,
                lamports,
                ReceiptState::LEN as u64,
                program_id,
            ),
            &[funder.clone(), receipt_info.clone(), system_program.clone()],
            &[&[
                b"receipt",
                state_info.key.as_ref(),
                funder.key.as_ref(),
                &[receipt_bump],
            ]],
        )?;
        let receipt = ReceiptState {
            state_pda: state_info.key.to_bytes(),
            funder: funder.key.to_bytes(),
            amount,
            bump: receipt_bump,
        };
        receipt.serialize(&mut &mut receipt_info.data.borrow_mut()[..])?;
    } else {
        let mut receipt = ReceiptState::try_from_slice(&receipt_info.data.borrow())?;
        receipt.amount = receipt
            .amount
            .checked_add(amount)
            .ok_or(EscrowError::MathOverflow)?;
        receipt.serialize(&mut &mut receipt_info.data.borrow_mut()[..])?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Withdraw
// ---------------------------------------------------------------------------
// After a successful withdraw both the vault and the state PDA are closed;
// their rent lamports are returned to the original payer stored in state.
// ---------------------------------------------------------------------------
fn process_withdraw(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut it = accounts.iter();
    let creator = next_account_info(&mut it)?;
    if !creator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if !creator.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }

    let state_info = next_account_info(&mut it)?;
    if !state_info.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }
    let state = ProjectState::try_from_slice(&state_info.data.borrow())?;

    if creator.key.to_bytes() != state.creator {
        return Err(ProgramError::IllegalOwner);
    }

    let clock = Clock::get()?;
    if clock.unix_timestamp < state.deadline_unix_ts {
        return Err(EscrowError::DeadlineNotReached.into());
    }

    let treasury = treasury_pubkey();
    let payer_key = Pubkey::new_from_array(state.payer);

    match state.asset_kind {
        0 => {
            let vault_info = next_account_info(&mut it)?;
            let treasury_info = next_account_info(&mut it)?;
            let payer_info = next_account_info(&mut it)?;

            if !vault_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !treasury_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !payer_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if *treasury_info.key != treasury {
                return Err(EscrowError::InvalidTreasury.into());
            }
            if *payer_info.key != payer_key {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_state, _) = derive_state_pda(program_id, creator.key, state.project_id);
            if expected_state != *state_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_vault, vault_bump) = derive_vault_authority(program_id, state_info.key);
            if expected_vault != *vault_info.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let distributable = state.total_funded;
            // vault holds funded lamports + its own rent; only distribute what
            // was actually funded, then close the vault to reclaim rent.
            let vault_balance = **vault_info.lamports.borrow();
            if vault_balance < distributable {
                return Err(EscrowError::MathOverflow.into());
            }

            let fee = distributable / 100;
            let payout = distributable
                .checked_sub(fee)
                .ok_or(EscrowError::MathOverflow)?;

            // Deduct only the funded portion; vault rent is reclaimed via close.
            {
                let mut vault_lamports = vault_info.lamports.borrow_mut();
                **vault_lamports = (**vault_lamports)
                    .checked_sub(distributable)
                    .ok_or(EscrowError::MathOverflow)?;
            }

            if fee > 0 {
                **treasury_info.lamports.borrow_mut() = treasury_info
                    .lamports()
                    .checked_add(fee)
                    .ok_or(EscrowError::MathOverflow)?;
            }
            if payout > 0 {
                **creator.lamports.borrow_mut() = creator
                    .lamports()
                    .checked_add(payout)
                    .ok_or(EscrowError::MathOverflow)?;
            }

            // Close vault (remaining rent → payer) then state (rent → payer).
            close_account(vault_info, payer_info)?;
            close_account(state_info, payer_info)?;

            Ok(())
        }
        1 => {
            let vault_authority = next_account_info(&mut it)?;
            let vault_ata = next_account_info(&mut it)?;
            let creator_ata = next_account_info(&mut it)?;
            let treasury_ata = next_account_info(&mut it)?;
            let token_program = next_account_info(&mut it)?;
            let payer_info = next_account_info(&mut it)?;

            if !vault_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !creator_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !treasury_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !payer_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if *token_program.key != spl_token::id() {
                return Err(ProgramError::IncorrectProgramId);
            }
            if *payer_info.key != payer_key {
                return Err(EscrowError::InvalidPda.into());
            }

            let mint = Pubkey::new_from_array(state.mint);

            let (expected_state, _) = derive_state_pda(program_id, creator.key, state.project_id);
            if expected_state != *state_info.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_vault_authority, vault_bump) =
                derive_vault_authority(program_id, state_info.key);
            if expected_vault_authority != *vault_authority.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let expected_vault_ata = get_associated_token_address(&expected_vault_authority, &mint);
            if expected_vault_ata != *vault_ata.key {
                return Err(EscrowError::InvalidPda.into());
            }

            let expected_creator_ata = get_associated_token_address(creator.key, &mint);
            if expected_creator_ata != *creator_ata.key {
                return Err(EscrowError::InvalidTokenAccount.into());
            }

            let expected_treasury_ata = get_associated_token_address(&treasury, &mint);
            if expected_treasury_ata != *treasury_ata.key {
                return Err(EscrowError::InvalidTreasury.into());
            }

            // Verify treasury ATA is initialized before attempting transfer.
            if treasury_ata.data_is_empty() || treasury_ata.lamports() == 0 {
                return Err(EscrowError::TreasuryAtaNotInitialized.into());
            }
            TokenAccount::unpack(&treasury_ata.data.borrow())
                .map_err(|_| EscrowError::TreasuryAtaNotInitialized)?;

            let vault_token = TokenAccount::unpack(&vault_ata.data.borrow())
                .map_err(|_| EscrowError::InvalidTokenAccount)?;
            let amount = vault_token.amount;
            let fee = amount / 100;
            let payout = amount
                .checked_sub(fee)
                .ok_or(EscrowError::MathOverflow)?;

            if fee > 0 {
                let ix = spl_token::instruction::transfer(
                    &spl_token::id(),
                    vault_ata.key,
                    treasury_ata.key,
                    vault_authority.key,
                    &[],
                    fee,
                )?;
                invoke_signed(
                    &ix,
                    &[
                        vault_ata.clone(),
                        treasury_ata.clone(),
                        vault_authority.clone(),
                        token_program.clone(),
                    ],
                    &[&[b"vault", state_info.key.as_ref(), &[vault_bump]]],
                )?;
            }
            if payout > 0 {
                let ix = spl_token::instruction::transfer(
                    &spl_token::id(),
                    vault_ata.key,
                    creator_ata.key,
                    vault_authority.key,
                    &[],
                    payout,
                )?;
                invoke_signed(
                    &ix,
                    &[
                        vault_ata.clone(),
                        creator_ata.clone(),
                        vault_authority.clone(),
                        token_program.clone(),
                    ],
                    &[&[b"vault", state_info.key.as_ref(), &[vault_bump]]],
                )?;
            }

            // Close vault ATA (close_account via token program), then state PDA.
            let close_ata_ix = spl_token::instruction::close_account(
                &spl_token::id(),
                vault_ata.key,
                payer_info.key,
                vault_authority.key,
                &[],
            )?;
            invoke_signed(
                &close_ata_ix,
                &[
                    vault_ata.clone(),
                    payer_info.clone(),
                    vault_authority.clone(),
                    token_program.clone(),
                ],
                &[&[b"vault", state_info.key.as_ref(), &[vault_bump]]],
            )?;

            close_account(state_info, payer_info)?;

            Ok(())
        }
        _ => Err(EscrowError::InvalidInstruction.into()),
    }
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------
// Funder reclaims their full contribution. Only valid before the deadline.
// The receipt PDA is closed and rent returned to the funder.
// state.total_funded is decremented so the budget slot opens back up.
//
// Accounts (SOL): funder, state_pda, vault, receipt_pda, system_program
// Accounts (SPL): funder, state_pda, funder_token, vault_authority, vault_ata, receipt_pda, token_program
// ---------------------------------------------------------------------------
fn process_refund(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut it = accounts.iter();
    let funder = next_account_info(&mut it)?;
    if !funder.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if !funder.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }

    let state_info = next_account_info(&mut it)?;
    if !state_info.is_writable {
        return Err(EscrowError::AccountNotWritable.into());
    }
    let mut state = ProjectState::try_from_slice(&state_info.data.borrow())?;

    // Refunds are only allowed before the deadline.
    let clock = Clock::get()?;
    if clock.unix_timestamp >= state.deadline_unix_ts {
        return Err(EscrowError::RefundNotAllowed.into());
    }

    let creator = Pubkey::new_from_array(state.creator);
    let (expected_state, _) = derive_state_pda(program_id, &creator, state.project_id);
    if expected_state != *state_info.key {
        return Err(EscrowError::InvalidPda.into());
    }

    match state.asset_kind {
        0 => {
            let vault_info = next_account_info(&mut it)?;
            let receipt_info = next_account_info(&mut it)?;
            let system_program = next_account_info(&mut it)?;

            if !vault_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !receipt_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            let (expected_vault, vault_bump) = derive_vault_authority(program_id, state_info.key);
            if expected_vault != *vault_info.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_receipt, _) =
                derive_receipt_pda(program_id, state_info.key, funder.key);
            if expected_receipt != *receipt_info.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if receipt_info.data_is_empty() {
                return Err(EscrowError::NoReceiptFound.into());
            }

            let receipt = ReceiptState::try_from_slice(&receipt_info.data.borrow())?;
            let refund_amount = receipt.amount;

            // Deduct from vault directly (vault is program-owned, no CPI needed).
            {
                let mut vault_lamports = vault_info.lamports.borrow_mut();
                **vault_lamports = (**vault_lamports)
                    .checked_sub(refund_amount)
                    .ok_or(EscrowError::MathOverflow)?;
            }
            **funder.lamports.borrow_mut() = funder
                .lamports()
                .checked_add(refund_amount)
                .ok_or(EscrowError::MathOverflow)?;

            state.total_funded = state
                .total_funded
                .checked_sub(refund_amount)
                .ok_or(EscrowError::MathOverflow)?;
            state.serialize(&mut &mut state_info.data.borrow_mut()[..])?;

            // Close receipt → rent back to funder.
            close_account(receipt_info, funder)?;

            let _ = system_program; // consumed by close via lamport manipulation
            Ok(())
        }
        1 => {
            let funder_token = next_account_info(&mut it)?;
            let vault_authority = next_account_info(&mut it)?;
            let vault_ata = next_account_info(&mut it)?;
            let receipt_info = next_account_info(&mut it)?;
            let token_program = next_account_info(&mut it)?;

            if !funder_token.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !vault_ata.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }
            if !receipt_info.is_writable {
                return Err(EscrowError::AccountNotWritable.into());
            }

            if *token_program.key != spl_token::id() {
                return Err(ProgramError::IncorrectProgramId);
            }

            let mint = Pubkey::new_from_array(state.mint);
            let (expected_vault_authority, vault_bump) =
                derive_vault_authority(program_id, state_info.key);
            let expected_vault_ata = get_associated_token_address(&expected_vault_authority, &mint);

            if *vault_authority.key != expected_vault_authority {
                return Err(EscrowError::InvalidPda.into());
            }
            if *vault_ata.key != expected_vault_ata {
                return Err(EscrowError::InvalidPda.into());
            }
            if vault_bump != state.vault_bump {
                return Err(EscrowError::InvalidPda.into());
            }

            let (expected_receipt, _) =
                derive_receipt_pda(program_id, state_info.key, funder.key);
            if expected_receipt != *receipt_info.key {
                return Err(EscrowError::InvalidPda.into());
            }
            if receipt_info.data_is_empty() {
                return Err(EscrowError::NoReceiptFound.into());
            }

            let receipt = ReceiptState::try_from_slice(&receipt_info.data.borrow())?;
            let refund_amount = receipt.amount;

            let ix = spl_token::instruction::transfer(
                &spl_token::id(),
                vault_ata.key,
                funder_token.key,
                vault_authority.key,
                &[],
                refund_amount,
            )?;
            invoke_signed(
                &ix,
                &[
                    vault_ata.clone(),
                    funder_token.clone(),
                    vault_authority.clone(),
                    token_program.clone(),
                ],
                &[&[b"vault", state_info.key.as_ref(), &[vault_bump]]],
            )?;

            state.total_funded = state
                .total_funded
                .checked_sub(refund_amount)
                .ok_or(EscrowError::MathOverflow)?;
            state.serialize(&mut &mut state_info.data.borrow_mut()[..])?;

            // Close receipt → rent back to funder.
            close_account(receipt_info, funder)?;

            Ok(())
        }
        _ => Err(EscrowError::InvalidInstruction.into()),
    }
}
