-- Migration to support KiraPay cross-chain payments and relay wallet features
-- This adds columns needed for tracking cross-chain contributions and payment methods

-- Add payment method tracking to contributions table
alter table public.contributions
  add column if not exists payment_method text default 'solana_wallet',
  add column if not exists kira_payment_code text,
  add column if not exists beneficiary_wallet text;

-- Add index for KiraPay payment codes for quick lookups
create index if not exists contributions_kira_payment_code_idx
  on public.contributions (kira_payment_code)
  where kira_payment_code is not null;

-- Add index for beneficiary wallet lookups (for refunds)
create index if not exists contributions_beneficiary_wallet_idx
  on public.contributions (beneficiary_wallet)
  where beneficiary_wallet is not null;

-- Add comment to explain payment_method values
comment on column public.contributions.payment_method is 
  'Payment method used: solana_wallet (direct), kira_pay (cross-chain), or relay_sponsored';

-- Add comment for kira_payment_code
comment on column public.contributions.kira_payment_code is 
  'KiraPay payment link code for cross-chain contributions';

-- Add comment for beneficiary_wallet
comment on column public.contributions.beneficiary_wallet is 
  'Wallet address of the actual beneficiary (may differ from funder if using relay wallet)';

-- Optional: Add a check constraint to ensure valid payment methods
alter table public.contributions
  add constraint contributions_payment_method_check
  check (payment_method in ('solana_wallet', 'kira_pay', 'relay_sponsored'));

-- Made with Bob
