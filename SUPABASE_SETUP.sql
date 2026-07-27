-- ============================================================
-- Supabase Setup SQL — run this in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste & run)
-- ============================================================

-- ── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── Core tables ──────────────────────────────────────────────

CREATE TABLE public.company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  legal_business_name text DEFAULT '',
  company_type text DEFAULT '',
  industry text DEFAULT '',
  pan text DEFAULT '',
  gstin text DEFAULT '',
  cin text DEFAULT '',
  msme_udyam text DEFAULT '',
  tan text DEFAULT '',
  transport_license_number text DEFAULT '',
  iec text DEFAULT '',
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  pin_code text DEFAULT '',
  mobile_number text DEFAULT '',
  telephone_number text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company TO anon, authenticated;
GRANT ALL ON public.company TO service_role;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage company" ON public.company FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER company_updated_at BEFORE UPDATE ON public.company FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  branch_type text DEFAULT '',
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  area_locality text DEFAULT '',
  landmark text DEFAULT '',
  city text DEFAULT '',
  district text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  pin_code text DEFAULT '',
  branch_phone text DEFAULT '',
  mobile_number text DEFAULT '',
  email_address text DEFAULT '',
  manager_name text DEFAULT '',
  manager_designation text DEFAULT '',
  manager_mobile text DEFAULT '',
  manager_email text DEFAULT '',
  gstin text DEFAULT '',
  pan text DEFAULT '',
  state_code text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO anon, authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage branches" ON public.branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL DEFAULT 'sky',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage app settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial rows
INSERT INTO public.app_settings (theme) VALUES ('sky');
INSERT INTO public.company (company_name) VALUES ('');

-- ── Departments & Vehicles & Drivers ─────────────────────────

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage departments" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL,
  internal_code text DEFAULT '',
  nickname text DEFAULT '',
  manufacturer text DEFAULT '',
  model text DEFAULT '',
  year_of_manufacture text DEFAULT '',
  fuel_type text DEFAULT '',
  payload_capacity_kg text DEFAULT '',
  purchase_date text DEFAULT '',
  purchase_cost text DEFAULT '',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage vehicles" ON public.vehicles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_code text NOT NULL,
  full_name text NOT NULL,
  guardian_name text DEFAULT '',
  date_of_birth text DEFAULT '',
  gender text DEFAULT '',
  marital_status text DEFAULT '',
  blood_group text DEFAULT '',
  mobile_number text DEFAULT '',
  alternate_mobile text DEFAULT '',
  email text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_number text DEFAULT '',
  emergency_contact_relationship text DEFAULT '',
  perm_address_line1 text DEFAULT '',
  perm_address_line2 text DEFAULT '',
  perm_city text DEFAULT '',
  perm_state text DEFAULT '',
  perm_country text DEFAULT '',
  perm_pin_code text DEFAULT '',
  curr_same_as_perm text DEFAULT '',
  curr_address_line1 text DEFAULT '',
  curr_address_line2 text DEFAULT '',
  curr_city text DEFAULT '',
  curr_state text DEFAULT '',
  curr_country text DEFAULT '',
  curr_pin_code text DEFAULT '',
  licence_number text DEFAULT '',
  licence_type text DEFAULT '',
  licence_authority text DEFAULT '',
  licence_issue_date text DEFAULT '',
  licence_expiry_date text DEFAULT '',
  salary_type text DEFAULT '',
  salary_amount text DEFAULT '',
  bank_name text DEFAULT '',
  bank_branch text DEFAULT '',
  bank_account_holder text DEFAULT '',
  bank_account_number text DEFAULT '',
  bank_ifsc text DEFAULT '',
  upi_id text DEFAULT '',
  aadhaar_number text DEFAULT '',
  pan_number text DEFAULT '',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO anon, authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage drivers" ON public.drivers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_name text NOT NULL,
  contact_person text DEFAULT '',
  mobile_number text DEFAULT '',
  alternate_mobile text DEFAULT '',
  email text DEFAULT '',
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  pin_code text DEFAULT '',
  gstin text DEFAULT '',
  pan text DEFAULT '',
  bank_name text DEFAULT '',
  bank_branch text DEFAULT '',
  bank_account_holder text DEFAULT '',
  bank_account_number text DEFAULT '',
  bank_ifsc text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporters TO anon, authenticated;
GRANT ALL ON public.transporters TO service_role;
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage transporters" ON public.transporters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_transporters_updated BEFORE UPDATE ON public.transporters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trips & Finance ──────────────────────────────────────────

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number text NOT NULL DEFAULT '',
  trip_date text DEFAULT '',
  from_location text DEFAULT '',
  to_location text DEFAULT '',
  distance_km text DEFAULT '',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  freight_amount text DEFAULT '',
  advance_amount text DEFAULT '',
  balance_amount text DEFAULT '',
  payment_status text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage trips" ON public.trips FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.closed_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  trip_number text DEFAULT '',
  closed_at timestamptz DEFAULT now(),
  closed_by text DEFAULT '',
  notes text DEFAULT '',
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
