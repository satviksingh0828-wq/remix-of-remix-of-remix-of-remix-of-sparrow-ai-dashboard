-- ============================================================
-- User Management SQL — Project TMS (ORCA DEVS SURF)
-- Run this in the Supabase SQL Editor AFTER the main
-- SUPABASE_SETUP.sql has been executed.
--
-- Adds:
--   • app_users           — operator accounts with role (admin/basic)
--   • user_branch_access  — which branches each basic user can access
--
-- Security design:
--   • app_users has NO anon/authenticated client access — only the
--     service_role key (used by server functions) can read/write it.
--     Passwords never reach the browser.
--   • user_branch_access is also service_role-only; branch filtering
--     is handled server-side and stored in the session token.
-- ============================================================

-- ── app_users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_users (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text    NOT NULL UNIQUE,
  password     text    NOT NULL,            -- plain-text; internal tool only
  full_name    text    NOT NULL DEFAULT '',
  role         text    NOT NULL DEFAULT 'basic'
               CHECK (role IN ('admin', 'basic')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Only service_role may access app_users; deny anon/authenticated entirely
GRANT ALL ON public.app_users TO service_role;
-- Revoke any accidental client grants (idempotent)
REVOKE ALL ON public.app_users FROM anon;
REVOKE ALL ON public.app_users FROM authenticated;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
-- No permissive policies for anon/authenticated — RLS implicitly denies them.
-- service_role bypasses RLS automatically.

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── user_branch_access ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_branch_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  branch_id  uuid NOT NULL REFERENCES public.branches(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

-- Only service_role may access user_branch_access
GRANT ALL ON public.user_branch_access TO service_role;
REVOKE ALL ON public.user_branch_access FROM anon;
REVOKE ALL ON public.user_branch_access FROM authenticated;

ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
-- No permissive policies for anon/authenticated.

CREATE INDEX IF NOT EXISTS user_branch_access_user_id_idx   ON public.user_branch_access(user_id);
CREATE INDEX IF NOT EXISTS user_branch_access_branch_id_idx ON public.user_branch_access(branch_id);

-- ── Default admin account ────────────────────────────────────
-- Username: admin  |  Password: testplay
-- Change the password after first login via the Users module.
INSERT INTO public.app_users (username, password, full_name, role)
VALUES ('admin', 'testplay', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;
