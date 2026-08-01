-- Vehicle trip logs: records fuel, parking and odometer per trip close
CREATE TABLE IF NOT EXISTS vehicle_trip_logs (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_code      text        NOT NULL,
  vehicle_id     uuid        REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_date      date,
  fuel_expense   numeric(12,2) DEFAULT 0,
  parking_charges numeric(12,2) DEFAULT 0,
  odometer_start numeric(10,2),
  odometer_end   numeric(10,2),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_trip_logs_vehicle_id_idx ON vehicle_trip_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_trip_logs_trip_code_idx  ON vehicle_trip_logs(trip_code);
CREATE INDEX IF NOT EXISTS vehicle_trip_logs_trip_date_idx  ON vehicle_trip_logs(trip_date);

-- Enable RLS (service-role key bypasses; anon/authenticated cannot read)
ALTER TABLE vehicle_trip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_vehicle_trip_logs"
  ON vehicle_trip_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────

-- Driver expense logs: records bata, morning, night per trip close
CREATE TABLE IF NOT EXISTS driver_expense_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_code   text        NOT NULL,
  driver_id   uuid        REFERENCES drivers(id) ON DELETE SET NULL,
  trip_date   date,
  driver_bata numeric(12,2) DEFAULT 0,
  morning_exp numeric(12,2) DEFAULT 0,
  night_exp   numeric(12,2) DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_expense_logs_driver_id_idx ON driver_expense_logs(driver_id);
CREATE INDEX IF NOT EXISTS driver_expense_logs_trip_code_idx ON driver_expense_logs(trip_code);
CREATE INDEX IF NOT EXISTS driver_expense_logs_trip_date_idx ON driver_expense_logs(trip_date);

ALTER TABLE driver_expense_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_driver_expense_logs"
  ON driver_expense_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────

-- Other expense logs: records dala, unloading, sunday + any non-standard expenses
CREATE TABLE IF NOT EXISTS other_expense_logs (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_code      text        NOT NULL,
  trip_date      date,
  dala_charges   numeric(12,2) DEFAULT 0,
  unloading      numeric(12,2) DEFAULT 0,
  sunday_exp     numeric(12,2) DEFAULT 0,
  other_amount   numeric(12,2) DEFAULT 0,
  other_details  jsonb         DEFAULT '[]',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS other_expense_logs_trip_code_idx ON other_expense_logs(trip_code);
CREATE INDEX IF NOT EXISTS other_expense_logs_trip_date_idx ON other_expense_logs(trip_date);

ALTER TABLE other_expense_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_other_expense_logs"
  ON other_expense_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);
