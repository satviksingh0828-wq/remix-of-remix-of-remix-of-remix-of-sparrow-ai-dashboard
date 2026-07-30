-- Per-route ranges: each contract_entry now carries its own freight and loading
-- range slabs instead of inheriting shared slabs from the parent contract.
--
-- Changes:
--   contract_entries → add 4 new columns, drop 4 old slab columns
--   contracts        → drop common range / basis columns (no longer needed)

-- ─── contract_entries ─────────────────────────────────────────────────────────

ALTER TABLE contract_entries
  ADD COLUMN IF NOT EXISTS freight_route_range_type text    NOT NULL DEFAULT 'weight',
  ADD COLUMN IF NOT EXISTS freight_route_ranges     jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS loading_route_range_type text    NOT NULL DEFAULT 'weight',
  ADD COLUMN IF NOT EXISTS loading_route_ranges     jsonb   NOT NULL DEFAULT '[]';

ALTER TABLE contract_entries
  DROP COLUMN IF EXISTS freight_values,
  DROP COLUMN IF EXISTS freight_charge_types,
  DROP COLUMN IF EXISTS loading_values,
  DROP COLUMN IF EXISTS loading_charge_types;

-- ─── contracts ────────────────────────────────────────────────────────────────

ALTER TABLE contracts
  DROP COLUMN IF EXISTS weight_ranges,
  DROP COLUMN IF EXISTS weight_ranges_2,
  DROP COLUMN IF EXISTS quantity_ranges,
  DROP COLUMN IF EXISTS quantity_ranges_2,
  DROP COLUMN IF EXISTS freight_basis,
  DROP COLUMN IF EXISTS loading_basis,
  DROP COLUMN IF EXISTS freight_weight_set,
  DROP COLUMN IF EXISTS loading_weight_set,
  DROP COLUMN IF EXISTS freight_quantity_set,
  DROP COLUMN IF EXISTS loading_quantity_set;
