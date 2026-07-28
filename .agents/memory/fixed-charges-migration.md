---
name: Fixed charges migration
description: DB schema changes needed for fixed income and trip reopen features.
---

# Required DB Changes

## contracts table — 4 new columns
```sql
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS fixed_monthly_charge  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_monthly_charge_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fixed_yearly_charge   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_yearly_charge_note  text NOT NULL DEFAULT '';
```

## trips table — 1 new column
```sql
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
```

## Migration file
`supabase/migrations/20260728120000_pnl_fixed_charges.sql` — contains both ALTER statements.

**Why:** ContractForm.tsx already had UI fields for these; they just needed DB backing. reopened_at is used for the 1-day auto-close after admin reopen logic.
