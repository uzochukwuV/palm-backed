# Supabase Migrations

This directory contains SQL migrations for the database schema.

## Migrations

1. **20260509000000_add_solana_funding_columns.sql**
   - Adds Solana on-chain integration columns to projects and contributions tables
   - Adds creator_wallet, on_chain_project_id, on_chain_deadline_unix_ts, etc.
   - Creates indexes for efficient lookups

2. **20260511000000_add_kira_pay_and_relay_columns.sql**
   - Adds KiraPay cross-chain payment support
   - Adds payment_method, kira_payment_code, beneficiary_wallet columns
   - Creates indexes for KiraPay lookups and refund operations

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run all pending migrations
supabase db push

# Or run migrations remotely
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order
4. Execute each migration

### Option 3: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# Run migrations in order
\i supabase/migrations/20260509000000_add_solana_funding_columns.sql
\i supabase/migrations/20260511000000_add_kira_pay_and_relay_columns.sql
```

## Verifying Migrations

After running migrations, verify the schema:

```sql
-- Check projects table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check contributions table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contributions'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('projects', 'contributions')
ORDER BY tablename, indexname;
```

## Rolling Back

If you need to roll back a migration:

```sql
-- Roll back KiraPay columns
ALTER TABLE public.contributions
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS kira_payment_code,
  DROP COLUMN IF EXISTS beneficiary_wallet;

DROP INDEX IF EXISTS contributions_kira_payment_code_idx;
DROP INDEX IF EXISTS contributions_beneficiary_wallet_idx;

-- Roll back Solana columns
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS creator_wallet,
  DROP COLUMN IF EXISTS on_chain_project_id,
  DROP COLUMN IF EXISTS on_chain_deadline_unix_ts,
  DROP COLUMN IF EXISTS on_chain_tx_signature,
  DROP COLUMN IF EXISTS on_chain_withdraw_tx_signature,
  DROP COLUMN IF EXISTS on_chain_total_funded;

DROP INDEX IF EXISTS projects_on_chain_project_id_idx;

ALTER TABLE public.contributions
  DROP COLUMN IF EXISTS transaction_signature;

DROP INDEX IF EXISTS contributions_transaction_signature_idx;
```

## Migration Status

Check which migrations have been applied:

```sql
-- If using Supabase migrations table
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;
```

## Troubleshooting

### Error: Column already exists
This is safe to ignore - the migrations use `IF NOT EXISTS` clauses.

### Error: Permission denied
Ensure you're connected as a user with sufficient privileges (postgres role).

### Error: Constraint violation
Check if there's existing data that violates the new constraints. You may need to clean up data before applying migrations.

## Local Development

For local development with Supabase:

```bash
# Start local Supabase
supabase start

# Apply migrations to local database
supabase db reset

# Or push specific migrations
supabase db push
```

## Production Deployment

Before deploying to production:

1. ✅ Test migrations on a staging database
2. ✅ Backup production database
3. ✅ Run migrations during low-traffic period
4. ✅ Verify data integrity after migration
5. ✅ Monitor application logs for errors

## Support

For issues with migrations:
- Check Supabase logs in the dashboard
- Verify database connection string
- Ensure migrations are run in order
- Contact support if persistent issues occur