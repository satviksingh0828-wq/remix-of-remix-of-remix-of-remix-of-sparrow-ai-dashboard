-- ============================================================
-- Supabase Logs Setup — Project TMS (Sparrow AI Solutions)
-- Run this in the Supabase SQL Editor AFTER the main
-- SUPABASE_SETUP.sql has been applied.
--
-- Creates the app_logs table for audit logging and activity
-- tracking. Only service_role can read/write logs — no direct
-- browser access is permitted.
-- ============================================================

-- ── app_logs table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,                        -- nullable (system events have no user)
  username     text        NOT NULL DEFAULT '',
  action       text        NOT NULL DEFAULT '',  -- e.g. "created", "updated", "deleted", "closed"
  entity_type  text        NOT NULL DEFAULT '',  -- e.g. "trip", "vehicle", "driver", "user", "login"
  entity_id    text        NOT NULL DEFAULT '',  -- PK of the affected row
  entity_label text        NOT NULL DEFAULT '',  -- human-readable name (trip code, username, etc.)
  details      jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- extra structured data
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Only the server-side service_role may access this table
GRANT ALL ON public.app_logs TO service_role;
REVOKE ALL ON public.app_logs FROM anon;
REVOKE ALL ON public.app_logs FROM authenticated;

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;
-- No permissive policies for anon/authenticated — RLS implicitly denies them.
-- service_role bypasses RLS automatically.

-- Indexes for fast filtering by the admin log panel
CREATE INDEX IF NOT EXISTS app_logs_entity_type_idx ON public.app_logs(entity_type);
CREATE INDEX IF NOT EXISTS app_logs_username_idx    ON public.app_logs(username);
CREATE INDEX IF NOT EXISTS app_logs_created_at_idx  ON public.app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS app_logs_entity_id_idx   ON public.app_logs(entity_id);
