-- Repair-and-verify script for the stable Trip QR Code and live-location setup.
-- Run DRIVER_APP_COMPLETE_FIX.sql first for the complete installation.
-- This preflight safely adds the stable token column if an older installation is present.
-- Every result should show the expected value in the "expected" column.

do $$
begin
  if to_regclass('public.driver_trip_qr_tokens') is null then
    raise exception 'driver_trip_qr_tokens is missing. Run DRIVER_APP_COMPLETE_FIX.sql first.';
  end if;
  execute 'alter table public.driver_trip_qr_tokens add column if not exists token text';
  execute 'alter table public.driver_trip_qr_tokens alter column expires_at drop not null';
end;
$$;

-- 1. Required tables.
select table_name,
       case when count(*) = 1 then 'OK' else 'MISSING' end as status,
       'driver_trip_qr_tokens, driver_trip_links, driver_trip_locations' as expected
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('driver_trip_qr_tokens', 'driver_trip_links', 'driver_trip_locations')
 group by table_name
 order by table_name;

-- 2. Required stable-QR columns.
select column_name, data_type, is_nullable,
       case
         when column_name = 'token' and data_type = 'text' then 'OK'
         when column_name = 'expires_at' and is_nullable = 'YES' then 'OK'
         else 'CHECK'
       end as status
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'driver_trip_qr_tokens'
   and column_name in ('trip_id', 'token', 'token_hash', 'expires_at', 'used_at')
 order by ordinal_position;

-- 3. Required functions and signatures.
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       case when p.proname in (
         'issue_driver_trip_qr', 'claim_driver_trip', 'get_driver_trip',
         'record_driver_location', 'end_driver_trip', 'get_trip_live_location'
       ) then 'OK' else 'CHECK' end as status
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in (
     'issue_driver_trip_qr', 'claim_driver_trip', 'get_driver_trip',
     'record_driver_location', 'end_driver_trip', 'get_trip_live_location'
   )
 order by p.proname, arguments;

-- 4. Required indexes and RLS.
select schemaname, tablename, indexname,
       case when indexname in (
         'driver_trip_qr_tokens_one_per_trip_idx',
         'driver_trip_links_one_active_device_idx',
         'driver_trip_locations_link_time_idx'
       ) then 'OK' else 'CHECK' end as status
  from pg_indexes
 where schemaname = 'public'
   and (
     indexname in (
       'driver_trip_qr_tokens_one_per_trip_idx',
       'driver_trip_links_one_active_device_idx',
       'driver_trip_locations_link_time_idx'
     )
     or tablename in ('driver_trip_qr_tokens', 'driver_trip_links', 'driver_trip_locations')
   )
 order by tablename, indexname;

select relname as table_name,
       relrowsecurity as rls_enabled,
       relforcerowsecurity as force_rls,
       case when relrowsecurity then 'OK' else 'CHECK' end as status
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('driver_trip_qr_tokens', 'driver_trip_links', 'driver_trip_locations')
 order by relname;

-- 5. Verify there is never more than one QR row per trip.
select trip_id, count(*) as qr_rows,
       case when count(*) = 1 then 'OK' else 'DUPLICATE QR ROWS' end as status
  from public.driver_trip_qr_tokens
 group by trip_id
 having count(*) <> 1;

-- 6. Verify stable QR rows have no expiry and a reusable token.
select count(*) as stable_qr_rows,
       count(*) filter (where token is null) as missing_tokens,
       count(*) filter (where expires_at is not null) as expiring_tokens,
       case
         when count(*) filter (where token is null) = 0
          and count(*) filter (where expires_at is not null) = 0 then 'OK'
         else 'REPAIR NEEDED'
       end as status
  from public.driver_trip_qr_tokens;

-- 7. Verify only own-vehicle trips can have a QR row.
select count(*) as invalid_non_own_qr_rows,
       case when count(*) = 0 then 'OK' else 'REPAIR NEEDED' end as status
  from public.driver_trip_qr_tokens q
  join public.trips t on t.id = q.trip_id
 where t.ownership <> 'own';

-- 8. Verify only one active device can be connected to a trip.
select trip_id, count(*) as active_devices,
       case when count(*) <= 1 then 'OK' else 'CONFLICT' end as status
  from public.driver_trip_links
 where ended_at is null
 group by trip_id
 having count(*) > 1;

-- 9. Verify live-location rows are structurally valid.
select count(*) as invalid_location_rows,
       case when count(*) = 0 then 'OK' else 'CHECK' end as status
  from public.driver_trip_locations
 where latitude not between -90 and 90
    or longitude not between -180 and 180
    or accuracy_m is not null and accuracy_m < 0;

-- 10. Optional live-location sample for own trips.
select t.trip_code,
       x.latitude,
       x.longitude,
       x.accuracy_m,
       x.recorded_at,
       l.last_seen_at,
       (l.ended_at is null) as tracking_active
  from public.driver_trip_links l
  join public.trips t on t.id = l.trip_id and t.ownership = 'own'
  left join lateral (
    select latitude, longitude, accuracy_m, recorded_at
      from public.driver_trip_locations
     where link_id = l.id
     order by recorded_at desc
     limit 1
  ) x on true
 order by x.recorded_at desc nulls last
 limit 50;

-- 11. Function source sanity checks.
select p.proname as function_name,
       case
         when p.proname = 'issue_driver_trip_qr'
          and pg_get_functiondef(p.oid) not like '%base64url%'
          and pg_get_functiondef(p.oid) like '%expires_at%'
          and pg_get_functiondef(p.oid) like '%stable%'
           then 'OK'
         when p.proname = 'get_trip_live_location'
          and pg_get_functiondef(p.oid) like '%latitude%'
          and pg_get_functiondef(p.oid) like '%longitude%'
           then 'OK'
         else 'CHECK'
       end as status
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('issue_driver_trip_qr', 'get_trip_live_location');

-- If the checks report REPAIR NEEDED, run DRIVER_APP_COMPLETE_FIX.sql again.
