-- ============================================================
-- Migration: Yearly Fixed Expenses
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the parent table for yearly fixed expense plans
CREATE TABLE IF NOT EXISTS public.yearly_fixed_expenses (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_name         TEXT          NOT NULL,
  total_amount         NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  monthly_amount       NUMERIC(12,2) NOT NULL,
  start_date           DATE          NOT NULL,
  end_date             DATE          NOT NULL,
  include_start_month  BOOLEAN       NOT NULL DEFAULT TRUE,
  note                 TEXT,
  branch_id            UUID          REFERENCES public.branches(id) ON DELETE SET NULL,
  status               TEXT          NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 2. Grant access + RLS (same pattern as all other tables in this app)
GRANT ALL ON public.yearly_fixed_expenses TO service_role;
ALTER TABLE public.yearly_fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage yearly fixed expenses"
  ON public.yearly_fixed_expenses
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 3. Add three columns to the expenditures table
--    is_yearly_fixed  — hides from basic users (same as is_emi)
--    yearly_fixed_id  — links back to the parent plan
--    yearly_fixed_inst_no — which of the 12 months this entry represents
ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS is_yearly_fixed       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yearly_fixed_id        UUID    REFERENCES public.yearly_fixed_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS yearly_fixed_inst_no   INTEGER;

-- 4. Index for fast lookups by plan
CREATE INDEX IF NOT EXISTS idx_expenditures_yearly_fixed_id
  ON public.expenditures (yearly_fixed_id)
  WHERE yearly_fixed_id IS NOT NULL;
