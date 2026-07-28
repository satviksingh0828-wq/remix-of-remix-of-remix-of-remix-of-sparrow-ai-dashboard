-- Add freight_quantity_set and loading_quantity_set to contracts
-- Mirrors the existing freight_weight_set / loading_weight_set columns.
-- 1 = use quantity_ranges, 2 = use quantity_ranges_2

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS freight_quantity_set smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loading_quantity_set  smallint NOT NULL DEFAULT 1;
