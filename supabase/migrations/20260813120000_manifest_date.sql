-- Run this in the Supabase SQL editor for an existing project.
ALTER TABLE public.trip_manifests
  ADD COLUMN IF NOT EXISTS manifest_date date;

COMMENT ON COLUMN public.trip_manifests.manifest_date IS
  'Manifest/LR issue date; nullable so missing-date admin alerts can be generated.';
