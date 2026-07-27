ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE TABLE public.closed_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code text NOT NULL,
  branch_id uuid,
  branch_name text DEFAULT '',
  start_date text DEFAULT '',
  end_date text DEFAULT '',
  total_income numeric NOT NULL DEFAULT 0,
  total_expense numeric NOT NULL DEFAULT 0,
  net_income numeric NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closed_trips TO anon, authenticated;
GRANT ALL ON public.closed_trips TO service_role;
ALTER TABLE public.closed_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage closed trips" ON public.closed_trips FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_closed_trips_updated_at BEFORE UPDATE ON public.closed_trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_name text NOT NULL DEFAULT '',
  amount text DEFAULT '',
  note text DEFAULT '',
  entry_date text DEFAULT '',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  is_received boolean NOT NULL DEFAULT false,
  received_date text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO anon, authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage incomes" ON public.incomes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_incomes_updated_at BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.expenditures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expenditure_name text NOT NULL DEFAULT '',
  amount text DEFAULT '',
  note text DEFAULT '',
  entry_date text DEFAULT '',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenditures TO anon, authenticated;
GRANT ALL ON public.expenditures TO service_role;
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage expenditures" ON public.expenditures FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_expenditures_updated_at BEFORE UPDATE ON public.expenditures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();