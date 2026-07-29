-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: app_settings — add login_ui + realtime + singleton guarantee
-- Run this in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the table if it somehow doesn't exist yet
CREATE TABLE IF NOT EXISTS public.app_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  theme      text        NOT NULL DEFAULT 'sky',
  login_ui   text        NOT NULL DEFAULT 'plain',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add login_ui column if the table already exists but the column is missing
--    (safe to run multiple times — IF NOT EXISTS prevents errors)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS login_ui text NOT NULL DEFAULT 'plain';

-- 3. Ensure exactly one settings row exists (the app is a singleton)
INSERT INTO public.app_settings (theme, login_ui)
SELECT 'sky', 'plain'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- 4. Grants & RLS (safe to re-run)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings' AND policyname = 'app can manage app settings'
  ) THEN
    CREATE POLICY "app can manage app settings"
      ON public.app_settings FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Enable real-time broadcasting so theme/loginUi changes on one device
--    instantly push to all other open sessions.
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- 6. Verify — shows you the current saved settings row
SELECT id, theme, login_ui, updated_at FROM public.app_settings;
