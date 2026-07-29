-- ============================================================
-- Migration: Fix Driver Payroll RLS + Add vehicle_id to yearly_fixed_expenses
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Fix RLS on driver_payrolls ────────────────────────────────────────────
-- The original migration only granted service_role access.
-- The app uses the publishable (anon) key, so we need anon + authenticated.

DROP POLICY IF EXISTS "service_role_all" ON driver_payrolls;

CREATE POLICY "app can manage driver payrolls"
  ON driver_payrolls
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. Fix RLS on driver_advances ────────────────────────────────────────────

DROP POLICY IF EXISTS "service_role_all" ON driver_advances;

CREATE POLICY "app can manage driver advances"
  ON driver_advances
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. Fix RLS on driver_advance_deductions ──────────────────────────────────

DROP POLICY IF EXISTS "service_role_all" ON driver_advance_deductions;

CREATE POLICY "app can manage driver advance deductions"
  ON driver_advance_deductions
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. Add vehicle_id to yearly_fixed_expenses ───────────────────────────────
-- Optional vehicle link; when set, the vehicle's branch auto-fills the
-- branch_id in the UI. The actual branch_id is still stored explicitly.

ALTER TABLE public.yearly_fixed_expenses
  ADD COLUMN IF NOT EXISTS vehicle_id UUID
    REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Index for quick lookup by vehicle
CREATE INDEX IF NOT EXISTS idx_yearly_fixed_expenses_vehicle_id
  ON public.yearly_fixed_expenses (vehicle_id)
  WHERE vehicle_id IS NOT NULL;

-- ── 5. Ensure expenditures has is_payroll filter column ──────────────────────
-- (These should already exist from 20260729000000_driver_payroll.sql,
--  but we add IF NOT EXISTS for safety.)

ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS is_payroll   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payroll_id   UUID REFERENCES public.driver_payrolls(id) ON DELETE SET NULL;

-- ── 6. Ensure expenditures has yearly_fixed columns ──────────────────────────
-- (These should already exist from 20260729120000_yearly_fixed_expenses.sql,
--  but we add IF NOT EXISTS for safety.)

ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS is_yearly_fixed      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yearly_fixed_id      UUID REFERENCES public.yearly_fixed_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS yearly_fixed_inst_no INTEGER;

-- Index for yearly_fixed lookups (if not already created)
CREATE INDEX IF NOT EXISTS idx_expenditures_yearly_fixed_id
  ON public.expenditures (yearly_fixed_id)
  WHERE yearly_fixed_id IS NOT NULL;
