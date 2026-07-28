-- Migration: add vehicle_id, driver_id, transporter_id to closed_trips
-- These columns were missing from the original schema.  The close-trip
-- server action has been updated to populate them for new records;
-- existing rows keep NULL (entity IDs are still recoverable from snapshot.trip).

ALTER TABLE public.closed_trips
  ADD COLUMN IF NOT EXISTS vehicle_id     uuid REFERENCES public.vehicles(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id      uuid REFERENCES public.drivers(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL;
