CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code text NOT NULL,
  ownership text NOT NULL DEFAULT 'own',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  start_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  end_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  start_date text DEFAULT '',
  start_time text DEFAULT '',
  end_date text DEFAULT '',
  end_time text DEFAULT '',
  odometer_start text DEFAULT '',
  odometer_end text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage trips" ON public.trips FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  manifest_number text NOT NULL DEFAULT '',
  from_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  from_pin_code text DEFAULT '',
  to_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  to_pin_code text DEFAULT '',
  weight_kg text DEFAULT '',
  quantity text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_manifests TO anon, authenticated;
GRANT ALL ON public.trip_manifests TO service_role;
ALTER TABLE public.trip_manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage trip manifests" ON public.trip_manifests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trip_manifests_updated_at BEFORE UPDATE ON public.trip_manifests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_other_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  income_name text NOT NULL DEFAULT '',
  amount text DEFAULT '',
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_other_income TO anon, authenticated;
GRANT ALL ON public.trip_other_income TO service_role;
ALTER TABLE public.trip_other_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage trip other income" ON public.trip_other_income FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trip_other_income_updated_at BEFORE UPDATE ON public.trip_other_income FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  expense_name text NOT NULL DEFAULT '',
  amount text DEFAULT '',
  note text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO anon, authenticated;
GRANT ALL ON public.trip_expenses TO service_role;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage trip expenses" ON public.trip_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trip_expenses_updated_at BEFORE UPDATE ON public.trip_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();