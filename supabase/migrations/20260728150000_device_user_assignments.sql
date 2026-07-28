-- Migration: Multi-user device assignments
-- Replaces the single app_user_id on device_registrations with a junction table
-- so one approved device can be assigned to multiple app user accounts.

-- ── Junction table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_user_assignments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registration_id UUID       NOT NULL REFERENCES device_registrations(id) ON DELETE CASCADE,
  app_user_id           UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_registration_id, app_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dua_device ON device_user_assignments(device_registration_id);
CREATE INDEX IF NOT EXISTS idx_dua_user   ON device_user_assignments(app_user_id);

-- ── Migrate existing assignments ───────────────────────────────────────────────
-- Copy any existing single-assignment rows into the junction table
INSERT INTO device_user_assignments (device_registration_id, app_user_id)
SELECT id, app_user_id
FROM device_registrations
WHERE app_user_id IS NOT NULL
ON CONFLICT (device_registration_id, app_user_id) DO NOTHING;

-- NOTE: We keep app_user_id on device_registrations as a nullable legacy column.
-- New code reads/writes device_user_assignments exclusively.
-- You can drop it later with: ALTER TABLE device_registrations DROP COLUMN app_user_id;
