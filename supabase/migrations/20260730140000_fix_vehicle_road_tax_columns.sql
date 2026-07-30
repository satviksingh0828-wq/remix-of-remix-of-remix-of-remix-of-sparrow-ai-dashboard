-- Fix vehicle_road_tax table: rename month/year to start_month/start_year, add end_month/end_year
-- This aligns the DB schema with the application code in vehicle-coverage.ts

ALTER TABLE public.vehicle_road_tax
  RENAME COLUMN month TO start_month;

ALTER TABLE public.vehicle_road_tax
  RENAME COLUMN year TO start_year;

ALTER TABLE public.vehicle_road_tax
  ADD COLUMN IF NOT EXISTS end_month SMALLINT NOT NULL DEFAULT 1 CHECK (end_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS end_year  SMALLINT NOT NULL DEFAULT 2000 CHECK (end_year >= 2000);

-- Back-fill end_month/end_year to match start (single-month entries)
UPDATE public.vehicle_road_tax
SET end_month = start_month,
    end_year  = start_year
WHERE end_year = 2000;

-- Drop the defaults now that data is populated
ALTER TABLE public.vehicle_road_tax
  ALTER COLUMN end_month DROP DEFAULT,
  ALTER COLUMN end_year  DROP DEFAULT;
