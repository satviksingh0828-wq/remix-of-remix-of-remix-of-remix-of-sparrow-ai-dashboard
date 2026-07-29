-- Migration: per-entry (route-wise) charge type overrides
--
-- Each contract_entry can now independently override whether each slab
-- is "rate" (amount × units) or "fixed" (flat charge) for both freight
-- and loading, instead of inheriting the charge_type from the contract's
-- range definition.
--
-- freight_charge_types / loading_charge_types are JSONB maps of:
--   { "<slab-key>": "rate" | "fixed", ... }
-- e.g. { "0-100": "rate", "100-500": "fixed", "500+": "rate" }
--
-- Missing keys fall back to the contract-level range charge_type,
-- which in turn defaults to "rate" — so all existing rows continue
-- to work without any data migration.

ALTER TABLE contract_entries
  ADD COLUMN IF NOT EXISTS freight_charge_types JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS loading_charge_types JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN contract_entries.freight_charge_types IS
  'Per-slab charge type overrides for freight. Map of slab-key → "rate"|"fixed". Missing keys fall back to the contract range charge_type.';

COMMENT ON COLUMN contract_entries.loading_charge_types IS
  'Per-slab charge type overrides for loading. Map of slab-key → "rate"|"fixed". Missing keys fall back to the contract range charge_type.';
