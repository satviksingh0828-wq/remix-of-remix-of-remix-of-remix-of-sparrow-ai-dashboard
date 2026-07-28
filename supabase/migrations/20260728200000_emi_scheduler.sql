-- ─────────────────────────────────────────────────────────────────────────────
-- EMI Scheduler migration
-- Adds: emi_schedules, emi_installments tables
--       is_emi + emi_installment_id columns on expenditures
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add new columns to expenditures ───────────────────────────────────────

ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS is_emi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emi_installment_id UUID;

-- ── 2. EMI Schedules ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emi_schedules (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  branch_id         UUID        REFERENCES branches(id) ON DELETE SET NULL,
  loan_amount       NUMERIC(14,2) NOT NULL,
  purchase_amount   NUMERIC(14,2),
  down_payment      NUMERIC(14,2),
  emi_type          TEXT        NOT NULL DEFAULT 'normal',  -- 'normal' | 'custom'
  interest_rate     NUMERIC(7,4),                           -- annual %, e.g. 9.5
  tenure_months     INTEGER,
  start_date        TEXT,
  lender_name       TEXT,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'cancelled'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. EMI Installments ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emi_installments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id           UUID        NOT NULL REFERENCES emi_schedules(id) ON DELETE CASCADE,
  installment_number    INTEGER     NOT NULL,
  due_date              TEXT        NOT NULL,
  amount                NUMERIC(14,2) NOT NULL,
  principal             NUMERIC(14,2),
  interest              NUMERIC(14,2),
  is_paid               BOOLEAN     NOT NULL DEFAULT false,
  paid_date             TEXT,
  expenditure_id        UUID        REFERENCES expenditures(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Back-link the installment → expenditure foreign key on expenditures
ALTER TABLE expenditures
  ADD CONSTRAINT IF NOT EXISTS expenditures_emi_installment_id_fkey
    FOREIGN KEY (emi_installment_id)
    REFERENCES emi_installments(id)
    ON DELETE SET NULL;

-- ── 4. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_emi_schedules_vehicle_id  ON emi_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_emi_schedules_branch_id   ON emi_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_emi_schedules_status      ON emi_schedules(status);

CREATE INDEX IF NOT EXISTS idx_emi_installments_schedule_id ON emi_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_emi_installments_is_paid     ON emi_installments(is_paid);

CREATE INDEX IF NOT EXISTS idx_expenditures_is_emi ON expenditures(is_emi);

-- ── 5. Updated-at triggers ────────────────────────────────────────────────────

-- Reuse or create a generic set-updated-at function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_emi_schedules_updated_at
  BEFORE UPDATE ON emi_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_emi_installments_updated_at
  BEFORE UPDATE ON emi_installments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Row-Level Security ────────────────────────────────────────────────────
-- The app uses a custom session (app_users table, not Supabase Auth),
-- so RLS is kept permissive here matching the pattern used by other tables.
-- Tighten these policies if your project adds Supabase Auth in the future.

ALTER TABLE emi_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_installments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (app enforces admin-only via UI)
CREATE POLICY "allow_all_emi_schedules"    ON emi_schedules    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_emi_installments" ON emi_installments FOR ALL USING (true) WITH CHECK (true);
