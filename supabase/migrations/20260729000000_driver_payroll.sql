-- ── Driver Payroll System ─────────────────────────────────────────────────────
-- Creates: driver_payrolls, driver_advances, driver_advance_deductions
-- Extends: expenditures (is_payroll, payroll_id)

-- ── 1. driver_payrolls ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_payrolls (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID          NOT NULL REFERENCES drivers(id)  ON DELETE CASCADE,
  branch_id         UUID          REFERENCES  branches(id)         ON DELETE SET NULL,
  month             TEXT          NOT NULL,             -- YYYY-MM
  salary_amount     NUMERIC(14,2) NOT NULL,
  advance_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount        NUMERIC(14,2) NOT NULL,
  is_paid           BOOLEAN       NOT NULL DEFAULT FALSE,
  paid_date         TEXT,
  expenditure_id    UUID,                               -- back-link set after expenditure insert
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, month)                             -- one payroll per driver per month
);

-- ── 2. driver_advances ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_advances (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID          NOT NULL REFERENCES drivers(id)  ON DELETE CASCADE,
  branch_id         UUID          REFERENCES  branches(id)         ON DELETE SET NULL,
  amount            NUMERIC(14,2) NOT NULL,             -- original advance amount
  remaining_balance NUMERIC(14,2) NOT NULL,             -- updated as deductions are applied
  payment_date      TEXT          NOT NULL,
  monthly_deduction NUMERIC(14,2) NOT NULL,             -- schedule amount per month
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 3. driver_advance_deductions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_advance_deductions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id       UUID          NOT NULL REFERENCES driver_advances(id)  ON DELETE CASCADE,
  driver_id        UUID          NOT NULL REFERENCES drivers(id)           ON DELETE CASCADE,
  payroll_id       UUID          REFERENCES driver_payrolls(id)            ON DELETE SET NULL,
  month            TEXT          NOT NULL,   -- YYYY-MM
  deduction_amount NUMERIC(14,2) NOT NULL,
  is_applied       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 4. expenditure_id FK on driver_payrolls ──────────────────────────────────
-- Added after expenditures table already exists
ALTER TABLE driver_payrolls
  ADD CONSTRAINT driver_payrolls_expenditure_id_fkey
  FOREIGN KEY (expenditure_id) REFERENCES expenditures(id) ON DELETE SET NULL;

-- ── 5. Extend expenditures ───────────────────────────────────────────────────
ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS is_payroll BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payroll_id UUID    REFERENCES driver_payrolls(id) ON DELETE SET NULL;

-- ── 6. Row-Level Security ────────────────────────────────────────────────────
ALTER TABLE driver_payrolls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_advances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_advance_deductions ENABLE ROW LEVEL SECURITY;

-- Service-role key has full access (all app writes use service_role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'driver_payrolls' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON driver_payrolls FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'driver_advances' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON driver_advances FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'driver_advance_deductions' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON driver_advance_deductions FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_driver_payrolls_driver_month  ON driver_payrolls(driver_id, month);
CREATE INDEX IF NOT EXISTS idx_driver_advances_driver        ON driver_advances(driver_id);
CREATE INDEX IF NOT EXISTS idx_adv_deductions_driver_month   ON driver_advance_deductions(driver_id, month);
CREATE INDEX IF NOT EXISTS idx_adv_deductions_advance        ON driver_advance_deductions(advance_id);
