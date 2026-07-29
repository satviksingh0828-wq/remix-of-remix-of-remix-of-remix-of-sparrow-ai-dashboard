-- Migration: Per-manifest Source
-- Run this in your Supabase Dashboard → SQL Editor
--
-- Adds a source_id column to trip_manifests so each manifest row can
-- independently reference a freight source (contract) for its rate calculations.
-- After running this, the trip-level contract_id on trips is no longer used by
-- the UI but is kept in the schema to preserve historical data.

ALTER TABLE public.trip_manifests
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;
