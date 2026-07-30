-- Add start_date, end_date, and status to contracts.
-- status: 'active' (default) or 'inactive'
-- Auto-set to inactive when end_date is reached (handled client-side on load).

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE,
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'active';

-- Existing contracts stay active
UPDATE contracts SET status = 'active' WHERE status IS NULL OR status = '';

-- Simple check constraint
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check CHECK (status IN ('active', 'inactive'));
