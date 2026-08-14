-- Garuda Driver's App: active device-session contract repair
-- Run this only after 20260814000000_driver_app_links.sql.
-- It restores the permanent QR, one-active-device, and session response contract.

create or replace function public.claim_driver_trip(p_qr_token text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_qr record;
  v_link record;
  v_session_token text;
  v_link_id uuid;
begin
  if coalesce(trim(p_qr_token), '') = '' or coalesce(trim(p_device_id), '') = '' then
    raise exception 'QR token and device ID are required';
  end if;

  select q.id, q.trip_id, t.trip_code
    into v_qr
    from public.driver_trip_qr_tokens q
    join public.trips t on t.id = q.trip_id
   where q.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
     and t.ownership = 'own'
     and coalesce(nullif(trim(t.end_date), ''), '') = ''
   for update;

  if not found then
    raise exception 'This Trip QR Code is not linked to an open own-vehicle trip';
  end if;

  select l.id, l.device_id
    into v_link
    from public.driver_trip_links l
   where l.trip_id = v_qr.trip_id
     and l.ended_at is null
   for update;

  if found and v_link.device_id <> p_device_id then
    return jsonb_build_object('status', 'already_linked', 'trip_code', v_qr.trip_code);
  end if;

  v_session_token := encode(gen_random_bytes(32), 'hex');
  if found then
    v_link_id := v_link.id;
    update public.driver_trip_links
       set session_token_hash = encode(digest(v_session_token, 'sha256'), 'hex'),
           last_seen_at = now()
     where id = v_link_id;
  else
    insert into public.driver_trip_links (trip_id, device_id, session_token_hash, last_seen_at)
    values (v_qr.trip_id, p_device_id, encode(digest(v_session_token, 'sha256'), 'hex'), now())
    returning id into v_link_id;
  end if;

  return jsonb_build_object(
    'status', 'linked',
    'session_token', v_session_token,
    'link_id', v_link_id,
    'trip_id', v_qr.trip_id,
    'trip_code', v_qr.trip_code
  );
exception when unique_violation then
  return jsonb_build_object('status', 'already_linked', 'message', 'Another device connected to this trip first');
end;
$$;

revoke all on function public.claim_driver_trip(text, text) from public;
grant execute on function public.claim_driver_trip(text, text) to anon, authenticated;

-- Expected inspection result: both contract keys are present in the function body.
select
  position('session_token' in pg_get_functiondef('public.claim_driver_trip(text, text)'::regprocedure)) > 0 as returns_session_token,
  position('link_id' in pg_get_functiondef('public.claim_driver_trip(text, text)'::regprocedure)) > 0 as returns_link_id;
