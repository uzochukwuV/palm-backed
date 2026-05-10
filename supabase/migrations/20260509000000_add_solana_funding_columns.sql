-- Adds the metadata needed to connect Supabase projects/contributions to the
-- deployed Solana solo_fund_program on devnet.
alter table public.projects
  add column if not exists creator_wallet text,
  add column if not exists on_chain_project_id text,
  add column if not exists on_chain_deadline_unix_ts bigint,
  add column if not exists on_chain_tx_signature text,
  add column if not exists on_chain_withdraw_tx_signature text,
  add column if not exists on_chain_total_funded numeric default 0;

create unique index if not exists projects_on_chain_project_id_idx
  on public.projects (on_chain_project_id)
  where on_chain_project_id is not null;

alter table public.contributions
  add column if not exists transaction_signature text;

create unique index if not exists contributions_transaction_signature_idx
  on public.contributions (transaction_signature)
  where transaction_signature is not null;
