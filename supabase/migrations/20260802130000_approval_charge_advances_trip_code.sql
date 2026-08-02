-- Store the user-facing trip code with transporter advance rows so reports can
-- display it even after live trips are closed/deleted.
ALTER TABLE public.approval_charge_advances
  ADD COLUMN IF NOT EXISTS trip_code text;

CREATE INDEX IF NOT EXISTS approval_charge_advances_trip_code_idx
  ON public.approval_charge_advances(trip_code);
