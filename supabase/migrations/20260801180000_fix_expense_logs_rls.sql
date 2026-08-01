-- Fix RLS policies on expense log tables to allow authenticated access,
-- matching the fastag_transactions policy pattern.

-- vehicle_trip_logs
DROP POLICY IF EXISTS "service_role_all_vehicle_trip_logs" ON vehicle_trip_logs;
CREATE POLICY "Allow all access to vehicle_trip_logs"
  ON vehicle_trip_logs FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- driver_expense_logs
DROP POLICY IF EXISTS "service_role_all_driver_expense_logs" ON driver_expense_logs;
CREATE POLICY "Allow all access to driver_expense_logs"
  ON driver_expense_logs FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- other_expense_logs
DROP POLICY IF EXISTS "service_role_all_other_expense_logs" ON other_expense_logs;
CREATE POLICY "Allow all access to other_expense_logs"
  ON other_expense_logs FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);
