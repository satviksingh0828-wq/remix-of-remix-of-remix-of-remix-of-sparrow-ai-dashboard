-- Revert the ON DELETE CASCADE FK added in 20260802140000.
-- approval_charge_advances entries must survive trip closure;
-- lifecycle is managed explicitly in application code via trip_code.
ALTER TABLE public.approval_charge_advances
  DROP CONSTRAINT IF EXISTS approval_charge_advances_trip_id_fkey;
