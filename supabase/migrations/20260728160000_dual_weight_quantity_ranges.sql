-- ── Dual weight/quantity range sets on contracts ────────────────────────────
--
-- Adds a second weight range set and a second quantity range set to contracts,
-- plus two columns that record which weight set each charge type uses.
--
-- Run this in: Supabase Dashboard → SQL Editor

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS weight_ranges_2    jsonb    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quantity_ranges_2  jsonb    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS freight_weight_set smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loading_weight_set smallint NOT NULL DEFAULT 1;

-- Existing rows get empty second sets (range 2 not active) and default to set 1
-- for both charges — identical behaviour to before.
