-- Separate storage for Approval Charge advance/balance details.
-- These values are intentionally kept out of trip income/expense totals.
CREATE TABLE IF NOT EXISTS public.approval_charge_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  advance numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS approval_charge_advances_trip_id_idx ON public.approval_charge_advances(trip_id);
CREATE INDEX IF NOT EXISTS approval_charge_advances_transporter_id_idx ON public.approval_charge_advances(transporter_id);
CREATE INDEX IF NOT EXISTS approval_charge_advances_created_at_idx ON public.approval_charge_advances(created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_charge_advances TO anon, authenticated;
GRANT ALL ON public.approval_charge_advances TO service_role;

ALTER TABLE public.approval_charge_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app can manage approval charge advances" ON public.approval_charge_advances;
CREATE POLICY "app can manage approval charge advances"
  ON public.approval_charge_advances FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_approval_charge_advances_updated ON public.approval_charge_advances;
CREATE TRIGGER trg_approval_charge_advances_updated
  BEFORE UPDATE ON public.approval_charge_advances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
