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

CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL DEFAULT 'sky',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.company TO service_role;
GRANT ALL ON public.branches TO service_role;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app can manage company" ON public.company FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app can manage branches" ON public.branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app can manage app settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER company_updated_at BEFORE UPDATE ON public.company FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (theme) VALUES ('sky');
INSERT INTO public.company (company_name) VALUES ('');