-- Focused repair for public.issue_driver_trip_qr.
-- Run this in Supabase SQL Editor when the QR button reports an issue_driver_trip_qr error.
-- This creates one permanent Trip QR Code per own-vehicle trip.

create extension if not exists pgcrypto;

create table if not exists public.driver_trip_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token text unique,
  token_hash text not null unique,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.driver_trip_qr_tokens add column if not exists token text;
alter table public.driver_trip_qr_tokens alter column expires_at drop not null;

-- Keep only the newest old QR row for each trip before enforcing one QR per trip.
delete from public.driver_trip_qr_tokens q
 where q.id in (
   select id
     from (
       select id,
              row_number() over (partition by trip_id order by created_at desc, id desc) as rn
         from public.driver_trip_qr_tokens
     ) duplicates
    where duplicates.rn > 1
 );

create index if not exists driver_trip_qr_tokens_trip_idx
  on public.driver_trip_qr_tokens (trip_id, created_at desc);

create unique index if not exists driver_trip_qr_tokens_one_per_trip_idx
  on public.driver_trip_qr_tokens (trip_id);

alter table public.driver_trip_qr_tokens enable row level security;
revoke all on public.driver_trip_qr_tokens from anon, authenticated;
grant all on public.driver_trip_qr_tokens to service_role;

drop function if exists public.issue_driver_trip_qr(uuid, integer);
drop function if exists public.issue_driver_trip_qr(uuid);

create or replace function public.issue_driver_trip_qr(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_trip record;
  v_token text;
begin
  select t.id, t.trip_code, t.ownership
    into v_trip
    from public.trips t
   where t.id = p_trip_id
     and t.ownership = 'own';

  if not found then
    raise exception 'Only own-vehicle trips can have a Trip QR Code';
  end if;

  -- Reuse the same token forever for the trip.
  select q.token
    into v_token
    from public.driver_trip_qr_tokens q
   where q.trip_id = v_trip.id
   for update;

  if v_token is null then
    v_token := encode(gen_random_bytes(32), 'hex');

    insert into public.driver_trip_qr_tokens (
      trip_id, token, token_hash, expires_at
    ) values (
      v_trip.id,
      v_token,
      encode(digest(v_token, 'sha256'), 'hex'),
      null
    )
    on conflict (trip_id) do update
      set token = excluded.token,
          token_hash = excluded.token_hash,
          expires_at = null;
  else
    update public.driver_trip_qr_tokens
       set expires_at = null
     where trip_id = v_trip.id;
  end if;

  return jsonb_build_object(
    'token', v_token,
    'trip_id', v_trip.id,
    'trip_code', v_trip.trip_code,
    'stable', true,
    'expires_at', null
  );
end;
$$;

revoke all on function public.issue_driver_trip_qr(uuid) from public;
grant execute on function public.issue_driver_trip_qr(uuid) to anon, authenticated;

-- Immediate verification of the repaired function and stable-token schema.
select
  p.oid::regprocedure as function_signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  case when pg_get_functiondef(p.oid) not like '%base64url%'
         and pg_get_functiondef(p.oid) like '%stable%'
       then 'OK' else 'CHECK' end as function_status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'issue_driver_trip_qr';

select
  count(*) filter (where token is null) as rows_missing_token,
  count(*) filter (where expires_at is not null) as rows_with_expiry,
  case when count(*) filter (where token is null) = 0
          and count(*) filter (where expires_at is not null) = 0
       then 'OK' else 'CHECK' end as stable_qr_status
from public.driver_trip_qr_tokens;
