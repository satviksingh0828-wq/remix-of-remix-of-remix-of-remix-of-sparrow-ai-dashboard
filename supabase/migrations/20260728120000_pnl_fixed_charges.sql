-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fixed charges on contracts + reopened_at on trips
-- ─────────────────────────────────────────────────────────────────────────────

-- Add fixed recurring charge columns to contracts (used by Fixed Incomes tab)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS fixed_monthly_charge  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_monthly_charge_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fixed_yearly_charge   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_yearly_charge_note  text NOT NULL DEFAULT '';

-- Add reopened_at column to trips (used for auto-close after reopen)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
