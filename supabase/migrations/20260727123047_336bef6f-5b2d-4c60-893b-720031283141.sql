
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
  legal_business_name text DEFAULT '',
  transporter_type text DEFAULT '',
  gstin text DEFAULT '',
  pan text DEFAULT '',
  msme_udyam text DEFAULT '',
  tan text DEFAULT '',
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  pin_code text DEFAULT '',
  primary_contact_name text DEFAULT '',
  primary_contact_designation text DEFAULT '',
  mobile_number text DEFAULT '',
  alternate_mobile text DEFAULT '',
  email text DEFAULT '',
  telephone text DEFAULT '',
  website text DEFAULT '',
  bank_name text DEFAULT '',
  bank_branch text DEFAULT '',
  bank_account_holder text DEFAULT '',
  bank_account_number text DEFAULT '',
  bank_ifsc text DEFAULT '',
  upi_id text DEFAULT '',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporters TO anon, authenticated;
GRANT ALL ON public.transporters TO service_role;
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage transporters" ON public.transporters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_transporters_updated BEFORE UPDATE ON public.transporters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name text NOT NULL,
  location_type text DEFAULT '',
  city text DEFAULT '',
  district text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  pin_code text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO anon, authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage locations" ON public.locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
