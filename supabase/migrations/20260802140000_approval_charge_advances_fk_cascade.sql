-- Add proper foreign key from approval_charge_advances.trip_id → trips.id
-- with ON DELETE CASCADE so the advance row is removed automatically
-- whenever the parent trip is deleted.

-- Drop the existing plain index first (it will be recreated as part of the FK)
-- The UNIQUE constraint already enforces one row per trip, so we just add the FK.
ALTER TABLE public.approval_charge_advances
  ADD CONSTRAINT approval_charge_advances_trip_id_fkey
  FOREIGN KEY (trip_id)
  REFERENCES public.trips(id)
  ON DELETE CASCADE;
