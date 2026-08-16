-- Driver App checkpoint verification and guarded trip closure.
-- Apply this file in the Supabase SQL Editor before deploying the matching app release.

begin;

alter table public.driver_trip_locations
  add column if not exists checkpoint_id text;

alter table public.driver_trip_links
  add column if not exists last_checkpoint_verification_at timestamptz,
  add column if not exists verified_checkpoint_count integer not null default 0;

create unique index if not exists driver_trip_locations_link_checkpoint_idx
  on public.driver_trip_locations (link_id, checkpoint_id)
  where checkpoint_id is not null;

create or replace function public.record_driver_locations(
  p_session_token text,
  p_locations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link_id uuid;
  v_accepted integer := 0;
begin
  select id into v_link_id
  from public.driver_trip_links
  where session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and ended_at is null;
  if not found then raise exception 'Driver session is not active'; end if;
  if jsonb_typeof(p_locations) <> 'array' or jsonb_array_length(p_locations) = 0 then
    raise exception 'At least one checkpoint is required';
  end if;

  with points as (
    select
      nullif(trim(point->>'checkpoint_id'), '') as checkpoint_id,
      (point->>'latitude')::double precision as latitude,
      (point->>'longitude')::double precision as longitude,
      nullif(point->>'accuracy', '')::double precision as accuracy_m,
      nullif(point->>'recorded_at', '')::timestamptz as recorded_at
    from jsonb_array_elements(p_locations) as point
  ), upserted as (
    insert into public.driver_trip_locations (link_id, checkpoint_id, latitude, longitude, accuracy_m, recorded_at)
    select v_link_id, checkpoint_id, latitude, longitude, accuracy_m, coalesce(recorded_at, now())
    from points
    on conflict (link_id, checkpoint_id) where checkpoint_id is not null do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy_m = excluded.accuracy_m,
        recorded_at = excluded.recorded_at
    returning 1
  )
  select count(*) into v_accepted from upserted;

  update public.driver_trip_links set last_seen_at = now() where id = v_link_id;
  return jsonb_build_object('accepted', v_accepted);
end;
$$;

create or replace function public.record_driver_location(
  p_session_token text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision default null,
  p_checkpoint_id text default null,
  p_recorded_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link_id uuid;
  v_checkpoint_id text := nullif(trim(coalesce(p_checkpoint_id, '')), '');
begin
  select id into v_link_id
  from public.driver_trip_links
  where session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and ended_at is null;
  if not found then raise exception 'Driver session is not active'; end if;

  if v_checkpoint_id is null then
    insert into public.driver_trip_locations (link_id, latitude, longitude, accuracy_m, recorded_at)
    values (v_link_id, p_latitude, p_longitude, p_accuracy_m, coalesce(p_recorded_at, now()));
  else
    insert into public.driver_trip_locations (link_id, checkpoint_id, latitude, longitude, accuracy_m, recorded_at)
    values (v_link_id, v_checkpoint_id, p_latitude, p_longitude, p_accuracy_m, coalesce(p_recorded_at, now()))
    on conflict (link_id, checkpoint_id) where checkpoint_id is not null do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy_m = excluded.accuracy_m,
        recorded_at = excluded.recorded_at;
  end if;

  update public.driver_trip_links set last_seen_at = now() where id = v_link_id;
  return jsonb_build_object('ok', true, 'checkpoint_id', v_checkpoint_id);
end;
$$;

create or replace function public.verify_driver_trip_checkpoints(
  p_session_token text,
  p_checkpoint_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link_id uuid;
  v_expected_ids text[];
  v_expected_count integer := 0;
  v_recorded_count integer := 0;
  v_missing_ids text[] := array[]::text[];
  v_verified_at timestamptz;
begin
  select id into v_link_id
  from public.driver_trip_links
  where session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and ended_at is null
  for update;
  if not found then raise exception 'Driver session is not active'; end if;

  select coalesce(array_agg(distinct checkpoint_id order by checkpoint_id), array[]::text[])
    into v_expected_ids
  from unnest(coalesce(p_checkpoint_ids, array[]::text[])) as checkpoint_id
  where nullif(trim(checkpoint_id), '') is not null;
  v_expected_count := cardinality(v_expected_ids);

  select count(*),
         coalesce(array_agg(expected.checkpoint_id order by expected.checkpoint_id) filter (where stored.checkpoint_id is null), array[]::text[])
    into v_recorded_count, v_missing_ids
  from unnest(v_expected_ids) as expected(checkpoint_id)
  left join public.driver_trip_locations stored
    on stored.link_id = v_link_id
   and stored.checkpoint_id = expected.checkpoint_id;

  if cardinality(v_missing_ids) = 0 then
    v_verified_at := now();
    update public.driver_trip_links
       set last_checkpoint_verification_at = v_verified_at,
           verified_checkpoint_count = v_expected_count,
           last_seen_at = v_verified_at
     where id = v_link_id;
  else
    update public.driver_trip_links set last_seen_at = now() where id = v_link_id;
  end if;

  return jsonb_build_object(
    'verified', cardinality(v_missing_ids) = 0,
    'expected_count', v_expected_count,
    'recorded_count', v_recorded_count,
    'missing_checkpoint_ids', to_jsonb(v_missing_ids),
    'verified_at', v_verified_at
  );
end;
$$;

create or replace function public.get_trip_driver_checkpoint_status(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link public.driver_trip_links%rowtype;
  v_stored_count integer := 0;
  v_verified boolean := false;
begin
  select * into v_link
  from public.driver_trip_links
  where trip_id = p_trip_id
  order by linked_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'linked', false,
      'active', false,
      'verified', true,
      'expected_count', 0,
      'recorded_count', 0,
      'verified_at', null
    );
  end if;

  select count(*) into v_stored_count
  from public.driver_trip_locations
  where link_id = v_link.id
    and checkpoint_id is not null;

  v_verified := v_link.ended_at is not null
    and v_link.last_checkpoint_verification_at is not null
    and v_stored_count = v_link.verified_checkpoint_count;

  return jsonb_build_object(
    'linked', true,
    'active', v_link.ended_at is null,
    'verified', v_verified,
    'expected_count', v_link.verified_checkpoint_count,
    'recorded_count', v_stored_count,
    'verified_at', v_link.last_checkpoint_verification_at,
    'ended_at', v_link.ended_at
  );
end;
$$;

create or replace function public.end_driver_trip(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link public.driver_trip_links%rowtype;
  v_stored_count integer := 0;
begin
  select * into v_link
  from public.driver_trip_links
  where session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and ended_at is null
  for update;
  if not found then raise exception 'Driver session is not active'; end if;

  select count(*) into v_stored_count
  from public.driver_trip_locations
  where link_id = v_link.id
    and checkpoint_id is not null;

  if v_link.last_checkpoint_verification_at is null
     or v_stored_count <> v_link.verified_checkpoint_count then
    raise exception 'Every checkpoint must be confirmed with Sparrow before ending this trip';
  end if;

  update public.driver_trip_links
     set ended_at = now(), last_seen_at = now()
   where id = v_link.id;
  return jsonb_build_object('ok', true, 'ended_at', now());
end;
$$;

revoke all on function public.record_driver_location(text, double precision, double precision, double precision, text, timestamptz) from public;
revoke all on function public.record_driver_locations(text, jsonb) from public;
revoke all on function public.verify_driver_trip_checkpoints(text, text[]) from public;
revoke all on function public.get_trip_driver_checkpoint_status(uuid) from public;
revoke all on function public.end_driver_trip(text) from public;
grant execute on function public.record_driver_location(text, double precision, double precision, double precision, text, timestamptz) to anon, authenticated;
grant execute on function public.record_driver_locations(text, jsonb) to anon, authenticated;
grant execute on function public.verify_driver_trip_checkpoints(text, text[]) to anon, authenticated;
grant execute on function public.get_trip_driver_checkpoint_status(uuid) to anon, authenticated;
grant execute on function public.end_driver_trip(text) to anon, authenticated;

commit;

-- Verification query: every line should be present after this migration.
select to_regprocedure('public.record_driver_locations(text,jsonb)') as record_driver_locations,
       to_regprocedure('public.verify_driver_trip_checkpoints(text,text[])') as verify_driver_trip_checkpoints,
       to_regprocedure('public.get_trip_driver_checkpoint_status(uuid)') as get_trip_driver_checkpoint_status,
       to_regprocedure('public.end_driver_trip(text)') as end_driver_trip;
