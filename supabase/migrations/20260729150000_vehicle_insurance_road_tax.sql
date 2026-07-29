-- =============================================
-- Vehicle Insurance table
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicle_insurance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_month      SMALLINT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_year       SMALLINT NOT NULL CHECK (start_year >= 2000),
  end_month        SMALLINT NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  end_year         SMALLINT NOT NULL CHECK (end_year >= 2000),
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  insurance_number TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One entry per period per vehicle
  CONSTRAINT uq_vehicle_insurance_period
    UNIQUE (vehicle_id, start_month, start_year, end_month, end_year),

  -- End must not be before start
  CONSTRAINT chk_insurance_period_order
    CHECK (
      end_year > start_year
      OR (end_year = start_year AND end_month >= start_month)
    )
);

ALTER TABLE public.vehicle_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vehicle_insurance"
  ON public.vehicle_insurance FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- Vehicle Road Tax table
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicle_road_tax (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         SMALLINT NOT NULL CHECK (year >= 2000),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  state        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No unique constraint: multiple entries for same period allowed
);

ALTER TABLE public.vehicle_road_tax ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vehicle_road_tax"
  ON public.vehicle_road_tax FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- Extend expenditures for insurance & road tax
-- =============================================
ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS is_insurance  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_road_tax   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insurance_id  UUID REFERENCES public.vehicle_insurance(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS road_tax_id   UUID REFERENCES public.vehicle_road_tax(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenditures_insurance_id
  ON public.expenditures(insurance_id) WHERE insurance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenditures_road_tax_id
  ON public.expenditures(road_tax_id) WHERE road_tax_id IS NOT NULL;
