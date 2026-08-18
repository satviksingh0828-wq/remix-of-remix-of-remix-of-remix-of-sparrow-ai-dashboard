-- Allow Trip QR issuance and claiming after a trip end date is entered.
-- End dates no longer revoke note/PDF, QR, or location access. Own-vehicle
-- validation and active-session/device safeguards remain in place.

begin;

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

  select q.token
    into v_token
    from public.driver_trip_qr_tokens q
   where q.trip_id = v_trip.id
   for update;

  if v_token is null then
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into public.driver_trip_qr_tokens (trip_id, token, token_hash, expires_at)
    values (v_trip.id, v_token, encode(digest(v_token, 'sha256'), 'hex'), null)
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

  select q.id, q.trip_id, t.trip_code, t.ownership
    into v_qr
    from public.driver_trip_qr_tokens q
    join public.trips t on t.id = q.trip_id
   where q.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
     and t.ownership = 'own'
   for update;

  if not found then
    raise exception 'This Trip QR Code is not linked to an own-vehicle trip';
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

grant execute on function public.issue_driver_trip_qr(uuid) to anon, authenticated;
grant execute on function public.claim_driver_trip(text, text) to anon, authenticated;

commit;
