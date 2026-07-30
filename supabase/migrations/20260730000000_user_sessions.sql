-- ─────────────────────────────────────────────────────────────────────────────
-- user_sessions: one active session per user (single-session enforcement)
--
-- • user_id is the primary key → only one row per user → new login overwrites
-- • session_token stores the HMAC-signed token generated at login
-- • last_seen_at is bumped every ~30 s by the client heartbeat
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_sessions (
  user_id     text        primary key,          -- matches app_users.id (uuid stored as text)
  session_token text      not null,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Only the service-role key (server-side) ever touches this table.
alter table public.user_sessions enable row level security;
-- No public policies – service role bypasses RLS automatically.

-- Index so heartbeat UPDATE by user_id is fast (primary key index covers it already).
-- Additional index on session_token for future lookups if needed:
create index if not exists idx_user_sessions_token on public.user_sessions (session_token);
