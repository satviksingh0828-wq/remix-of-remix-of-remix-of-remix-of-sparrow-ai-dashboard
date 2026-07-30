-- Add engine number and chassis number columns to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS engine_no text,
  ADD COLUMN IF NOT EXISTS chassis_no text;
