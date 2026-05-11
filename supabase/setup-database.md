# Database Setup Guide

## Quick Setup (Recommended)

### Step 1: Run Migrations in Supabase Dashboard

Go to your Supabase project dashboard → **SQL Editor** and run these migrations **in order**:

#### 1. Initial Schema (REQUIRED - Run First!)
Copy and paste the contents of `20260508000000_initial_schema.sql`

This creates:
- ✅ profiles table
- ✅ projects table
- ✅ contributions table
- ✅ project_updates table
- ✅ project_resources table
- ✅ Row Level Security policies
- ✅ Automatic profile creation on signup

#### 2. Solana Integration
Copy and paste the contents of `20260509000000_add_solana_funding_columns.sql`

This adds:
- ✅ creator_wallet column
- ✅ on_chain_project_id column
- ✅ on_chain_deadline_unix_ts column
- ✅ on_chain_tx_signature column
- ✅ transaction_signature column to contributions

#### 3. KiraPay & Relay Wallet Support
Copy and paste the contents of `20260511000000_add_kira_pay_and_relay_columns.sql`

This adds:
- ✅ payment_method column
- ✅ kira_payment_code column
- ✅ beneficiary_wallet column

### Step 2: Verify Tables Exist

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- contributions
- profiles
- project_resources
- project_updates
- projects

### Step 3: Verify Columns

```sql
-- Check projects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- Check contributions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contributions' 
ORDER BY ordinal_position;
```

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

## Troubleshooting

### Error: "Could not find the table 'public.projects'"

**Solution:** You haven't run the initial schema migration yet. Run `20260508000000_initial_schema.sql` first.

### Error: "column does not exist"

**Solution:** Run migrations in order:
1. Initial schema (20260508...)
2. Solana columns (20260509...)
3. KiraPay columns (20260511...)

### Error: "relation already exists"

**Solution:** This is safe to ignore if using `IF NOT EXISTS` clauses. The migration is idempotent.

### Error: "permission denied"

**Solution:** Make sure you're running migrations as the postgres user in Supabase dashboard.

## After Running Migrations

1. ✅ Test creating a profile (automatic on signup)
2. ✅ Test creating a project
3. ✅ Test making a contribution
4. ✅ Verify RLS policies are working

## Migration Order Summary

```
20260508000000_initial_schema.sql          ← Run FIRST
20260509000000_add_solana_funding_columns.sql
20260511000000_add_kira_pay_and_relay_columns.sql
```

## Need Help?

Check the main README.md in the migrations folder for more details.