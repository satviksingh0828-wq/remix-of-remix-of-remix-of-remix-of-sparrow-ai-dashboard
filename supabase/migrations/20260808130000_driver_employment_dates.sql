-- Track a driver's employment period. The ending date is inclusive.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS ending_date date;

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_employment_dates_valid;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_employment_dates_valid
  CHECK (ending_date IS NULL OR joining_date IS NULL OR ending_date >= joining_date);

