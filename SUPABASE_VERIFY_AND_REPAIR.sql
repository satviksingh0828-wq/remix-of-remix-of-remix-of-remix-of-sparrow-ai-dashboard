-- GARUDA LOGISTICS: verify and repair the database changes introduced by the
-- manifest-date and notification-email features. Safe to run more than once
-- in the Supabase SQL Editor. The script fails clearly if prerequisite tables
-- are absent, applies missing columns/indexes, validates their types, and ends
-- with a status report.

DO $$
BEGIN
  IF to_regclass('public.trip_manifests') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table public.trip_manifests. Run SUPABASE_SETUP.sql first.';
  END IF;
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite table public.notifications. Run migration 20260802100000_notifications.sql first.';
  END IF;
END $$;

ALTER TABLE public.trip_manifests
  ADD COLUMN IF NOT EXISTS manifest_date date;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

COMMENT ON COLUMN public.trip_manifests.manifest_date IS
  'Manifest/LR issue date; nullable so missing-date admin alerts can be generated.';
COMMENT ON COLUMN public.notifications.emailed_at IS
  'Timestamp after the notification was delivered to all configured admin inboxes.';

CREATE INDEX IF NOT EXISTS trip_manifests_manifest_date_idx
  ON public.trip_manifests (manifest_date);
CREATE INDEX IF NOT EXISTS notifications_pending_email_idx
  ON public.notifications (created_at)
  WHERE dismissed = false AND emailed_at IS NULL;

DO $$
DECLARE
  manifest_type text;
  emailed_type text;
BEGIN
  SELECT data_type INTO manifest_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'trip_manifests' AND column_name = 'manifest_date';

  SELECT data_type INTO emailed_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'emailed_at';

  IF manifest_type IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'trip_manifests.manifest_date has wrong type: % (expected date)', manifest_type;
  END IF;
  IF emailed_type IS DISTINCT FROM 'timestamp with time zone' THEN
    RAISE EXCEPTION 'notifications.emailed_at has wrong type: % (expected timestamptz)', emailed_type;
  END IF;
END $$;

SELECT check_name, status
FROM (VALUES
  ('trip_manifests.manifest_date', CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trip_manifests'
      AND column_name='manifest_date' AND data_type='date') THEN 'OK' ELSE 'FAILED' END),
  ('notifications.emailed_at', CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications'
      AND column_name='emailed_at' AND data_type='timestamp with time zone') THEN 'OK' ELSE 'FAILED' END),
  ('notifications pending-email index', CASE WHEN to_regclass('public.notifications_pending_email_idx') IS NOT NULL THEN 'OK' ELSE 'FAILED' END),
  ('manifest-date index', CASE WHEN to_regclass('public.trip_manifests_manifest_date_idx') IS NOT NULL THEN 'OK' ELSE 'FAILED' END)
) AS verification(check_name, status);
