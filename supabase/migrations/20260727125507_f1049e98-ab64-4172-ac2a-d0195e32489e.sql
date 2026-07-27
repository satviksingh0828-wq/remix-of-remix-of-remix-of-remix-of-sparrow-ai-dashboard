
-- 1. Add branch_id and copy from department_id by matching name
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.transporters ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

UPDATE public.vehicles v SET branch_id = b.id
FROM public.departments d JOIN public.branches b ON lower(b.branch_name) = lower(d.name)
WHERE v.department_id = d.id;

UPDATE public.drivers dr SET branch_id = b.id
FROM public.departments d JOIN public.branches b ON lower(b.branch_name) = lower(d.name)
WHERE dr.department_id = d.id;

UPDATE public.transporters t SET branch_id = b.id
FROM public.departments d JOIN public.branches b ON lower(b.branch_name) = lower(d.name)
WHERE t.department_id = d.id;

-- 2. Drop department_id and the departments table
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.drivers DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.transporters DROP COLUMN IF EXISTS department_id;
DROP TABLE IF EXISTS public.departments CASCADE;

-- 3. contracts
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_name text NOT NULL,
  weight_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantity_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  freight_basis text NOT NULL DEFAULT 'weight',
  loading_basis text NOT NULL DEFAULT 'weight',
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

-- 4. contract_entries
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
