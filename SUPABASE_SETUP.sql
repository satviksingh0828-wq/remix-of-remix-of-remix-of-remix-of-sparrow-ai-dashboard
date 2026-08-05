-- ============================================================
-- Supabase Setup SQL — Project TMS (Orca Solutions)
-- Run this once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste all → Run
--
-- This file is the canonical schema, produced by consolidating
-- all supabase/migrations/* files in order.
--
-- RLS note: All policies grant full access to `anon` and
-- `authenticated` roles. This app uses a localStorage-based
-- session (no Supabase Auth), so every browser request arrives
-- as the `anon` role. Before exposing this to the public
-- internet, restrict policies to authenticated users only.
-- ============================================================

-- ── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ════════════════════════════════════════════════════════════
-- Migration 1: company, branches, app_settings
-- ════════════════════════════════════════════════════════════

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

INSERT INTO public.app_settings (theme) VALUES ('sky');
INSERT INTO public.company (company_name) VALUES ('');

-- ════════════════════════════════════════════════════════════
-- Migration 2: vehicles, drivers, transporters, locations
-- (departments table was created then dropped in migration 3;
--  branch_id is the direct FK used in the final schema)
-- ════════════════════════════════════════════════════════════

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
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
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
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
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
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
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

-- ════════════════════════════════════════════════════════════
-- Migration 3: contracts, contract_entries
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_name text NOT NULL,
  weight_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantity_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  freight_basis text NOT NULL DEFAULT 'weight',
  loading_basis text NOT NULL DEFAULT 'weight',
  -- Fixed recurring charges (used in Fixed Incomes tab)
  fixed_monthly_charge  numeric NOT NULL DEFAULT 0,
  fixed_monthly_charge_note text NOT NULL DEFAULT '',
  fixed_yearly_charge   numeric NOT NULL DEFAULT 0,
  fixed_yearly_charge_note  text NOT NULL DEFAULT '',
  -- Company details
  company_name text DEFAULT '',
  legal_business_name text DEFAULT '',
  company_type text DEFAULT '',
  industry text DEFAULT '',
  pan text DEFAULT '',
  gstin text DEFAULT '',
  cin text DEFAULT '',
  msme_udyam text DEFAULT '',
  tan text DEFAULT '',
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated, anon;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage contracts" ON public.contracts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contract_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  from_pin_code text DEFAULT '',
  to_pin_code text DEFAULT '',
  freight_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  loading_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  monthly_change_amount text DEFAULT '',
  monthly_change_note text DEFAULT '',
  yearly_change_amount text DEFAULT '',
  yearly_change_note text DEFAULT '',
  per_manifest_amount text DEFAULT '',
  per_manifest_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_entries TO authenticated, anon;
GRANT ALL ON public.contract_entries TO service_role;
ALTER TABLE public.contract_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app can manage contract entries" ON public.contract_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER contract_entries_set_updated_at BEFORE UPDATE ON public.contract_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX contract_entries_contract_id_idx ON public.contract_entries(contract_id);

-- ════════════════════════════════════════════════════════════
-- Migration 4: trips, trip_manifests, trip_other_income, trip_expenses
-- ════════════════════════════════════════════════════════════

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
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  reopened_at timestamptz,
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

-- ════════════════════════════════════════════════════════════
-- Migration 5: closed_trips, incomes, expenditures
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.closed_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code text NOT NULL,
  branch_id uuid,
  branch_name text DEFAULT '',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
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

-- ════════════════════════════════════════════════════════════
-- Migration 6: app_users, user_branch_access
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.app_users (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text    NOT NULL UNIQUE,
  password     text    NOT NULL,
  full_name    text    NOT NULL DEFAULT '',
  role         text    NOT NULL DEFAULT 'basic'
               CHECK (role IN ('admin', 'basic')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
REVOKE ALL ON public.app_users FROM anon;
REVOKE ALL ON public.app_users FROM authenticated;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_branch_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  branch_id  uuid NOT NULL REFERENCES public.branches(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);
GRANT ALL ON public.user_branch_access TO service_role;
REVOKE ALL ON public.user_branch_access FROM anon;
REVOKE ALL ON public.user_branch_access FROM authenticated;
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_branch_access_user_id_idx   ON public.user_branch_access(user_id);
CREATE INDEX user_branch_access_branch_id_idx ON public.user_branch_access(branch_id);

-- Default admin account (username: admin | password: testplay)
INSERT INTO public.app_users (username, password, full_name, role)
VALUES ('admin', 'testplay', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- Migration 7: app_logs
-- ════════════════════════════════════════════════════════════
-- See SUPABASE_LOGS_SETUP.sql for the app_logs table definition.

-- ════════════════════════════════════════════════════════════
-- Migration 8: fixed charges on contracts + reopened_at on trips
-- ════════════════════════════════════════════════════════════
-- Already included above in the contracts and trips tables.
-- When running on an existing DB, use:
--   ALTER TABLE public.contracts
--     ADD COLUMN IF NOT EXISTS fixed_monthly_charge  numeric NOT NULL DEFAULT 0,
--     ADD COLUMN IF NOT EXISTS fixed_monthly_charge_note text NOT NULL DEFAULT '',
--     ADD COLUMN IF NOT EXISTS fixed_yearly_charge   numeric NOT NULL DEFAULT 0,
--     ADD COLUMN IF NOT EXISTS fixed_yearly_charge_note  text NOT NULL DEFAULT '';
--   ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
-- See supabase/migrations/20260728120000_pnl_fixed_charges.sql
