-- Add exact start_date / end_date columns to vehicle_insurance and vehicle_road_tax.
-- Monthly expense amounts will be recalculated using actual days per month
-- (total_amount / total_days * days_in_that_month) instead of equal monthly split.

-- ── vehicle_insurance ─────────────────────────────────────────────────────────
ALTER TABLE vehicle_insurance
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

-- Backfill existing rows: 1st of start month → last day of end month
UPDATE vehicle_insurance
SET
  start_date = make_date(start_year, start_month, 1),
  end_date   = (make_date(end_year, end_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
WHERE start_date IS NULL;

ALTER TABLE vehicle_insurance
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;

-- ── vehicle_road_tax ──────────────────────────────────────────────────────────
ALTER TABLE vehicle_road_tax
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

UPDATE vehicle_road_tax
SET
  start_date = make_date(start_year, start_month, 1),
  end_date   = (make_date(end_year, end_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
WHERE start_date IS NULL;

ALTER TABLE vehicle_road_tax
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;
