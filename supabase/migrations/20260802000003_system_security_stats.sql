-- ============================================================
-- System page – Security Stats RPC
-- Aggregates user account health, passkey device registrations,
-- active sessions, and recent security events from app_logs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_security_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users         jsonb;
  v_failed_users  jsonb;
  v_devices       jsonb;
  v_sessions      jsonb;
  v_recent_events jsonb;
BEGIN
  -- ── User account summary ───────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'total',                COUNT(*),
    'active',               COUNT(*) FILTER (WHERE is_active = true  AND is_paused = false),
    'inactive',             COUNT(*) FILTER (WHERE is_active = false),
    'paused',               COUNT(*) FILTER (WHERE is_paused = true),
    'admins',               COUNT(*) FILTER (WHERE role = 'admin'),
    'basic',                COUNT(*) FILTER (WHERE role = 'basic'),
    'viewers',              COUNT(*) FILTER (WHERE role = 'viewer'),
    'with_failed_attempts', COUNT(*) FILTER (WHERE failed_login_attempts > 0)
  )
  INTO v_users
  FROM public.app_users;

  -- ── Accounts with failed login attempts (top 20) ──────────────────────────
  SELECT COALESCE(jsonb_agg(u ORDER BY (u->>'failed_login_attempts')::int DESC), '[]'::jsonb)
  INTO v_failed_users
  FROM (
    SELECT jsonb_build_object(
      'id',                     id,
      'username',               username,
      'full_name',              full_name,
      'role',                   role,
      'failed_login_attempts',  failed_login_attempts,
      'is_paused',              is_paused,
      'is_active',              is_active
    ) AS u
    FROM public.app_users
    WHERE failed_login_attempts > 0
    ORDER BY failed_login_attempts DESC
    LIMIT 20
  ) sub;

  -- ── Passkey / device registration counts ──────────────────────────────────
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'total',    COUNT(*),
      'pending',  COUNT(*) FILTER (WHERE status = 'pending'),
      'approved', COUNT(*) FILTER (WHERE status = 'approved'),
      'rejected', COUNT(*) FILTER (WHERE status = 'rejected')
    ) FROM public.device_registrations),
    jsonb_build_object('total',0,'pending',0,'approved',0,'rejected',0)
  ) INTO v_devices;

  -- ── Active sessions ────────────────────────────────────────────────────────
  SELECT COALESCE(
    (SELECT jsonb_build_object('active_sessions', COUNT(*))
     FROM public.user_sessions),
    jsonb_build_object('active_sessions', 0)
  ) INTO v_sessions;

  -- ── Recent security events from app_logs (last 50) ────────────────────────
  SELECT COALESCE(jsonb_agg(l ORDER BY l->>'created_at' DESC), '[]'::jsonb)
  INTO v_recent_events
  FROM (
    SELECT jsonb_build_object(
      'id',           id,
      'username',     username,
      'action',       action,
      'entity_type',  entity_type,
      'details',      details,
      'created_at',   created_at
    ) AS l
    FROM public.app_logs
    WHERE
      entity_type = 'login'
      OR action ILIKE '%fail%'
      OR action ILIKE '%sign in%'
      OR action ILIKE '%sign out%'
      OR action ILIKE '%paused%'
      OR action ILIKE '%passkey%'
      OR action ILIKE '%device%'
    ORDER BY created_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object(
    'users',         v_users,
    'failed_users',  COALESCE(v_failed_users,  '[]'::jsonb),
    'devices',       v_devices,
    'sessions',      v_sessions,
    'recent_events', COALESCE(v_recent_events, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_stats TO anon, authenticated, service_role;
