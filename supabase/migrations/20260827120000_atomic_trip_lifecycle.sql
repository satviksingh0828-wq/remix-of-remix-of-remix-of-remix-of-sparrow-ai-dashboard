-- Atomic trip lifecycle hardening.
-- Apply this migration before deploying the matching application code.
-- Existing duplicate archive rows are preserved; no historical rows are deleted here.

begin;

alter table public.trips
  add column if not exists third_party_vehicle_number text,
  add column if not exists reopened_from_closed_id uuid;

alter table public.closed_trips
  add column if not exists third_party_vehicle_number text,
  add column if not exists source_trip_id uuid;

alter table public.fastag_transactions add column if not exists trip_id uuid;
alter table public.vehicle_trip_logs add column if not exists trip_id uuid;
alter table public.driver_expense_logs add column if not exists trip_id uuid;
alter table public.other_expense_logs add column if not exists trip_id uuid;
alter table public.transporter_expense_logs add column if not exists trip_id uuid;

create index if not exists trips_reopened_from_closed_id_idx
  on public.trips (reopened_from_closed_id);
create unique index if not exists trips_reopened_from_closed_id_key
  on public.trips (reopened_from_closed_id)
  where reopened_from_closed_id is not null;
create index if not exists closed_trips_source_trip_id_idx
  on public.closed_trips (source_trip_id);
create index if not exists fastag_transactions_trip_id_idx
  on public.fastag_transactions (trip_id);
create index if not exists vehicle_trip_logs_trip_id_idx
  on public.vehicle_trip_logs (trip_id);
create index if not exists driver_expense_logs_trip_id_idx
  on public.driver_expense_logs (trip_id);
create index if not exists other_expense_logs_trip_id_idx
  on public.other_expense_logs (trip_id);
create index if not exists transporter_expense_logs_trip_id_idx
  on public.transporter_expense_logs (trip_id);

-- The current live table has no duplicate trip codes. This prevents future
-- accidental reuse while leaving historical duplicate archives untouched.
create unique index if not exists trips_trip_code_key on public.trips (trip_code);

create or replace function public.close_trip_atomic(
  p_trip_id uuid,
  p_trip_snapshot jsonb,
  p_trip_code text,
  p_branch_id uuid,
  p_branch_name text,
  p_vehicle_id uuid,
  p_driver_id uuid,
  p_transporter_id uuid,
  p_third_party_vehicle_number text,
  p_start_date text,
  p_end_date text,
  p_total_income numeric,
  p_total_expense numeric,
  p_net_income numeric,
  p_fastag jsonb default null,
  p_vehicle_log jsonb default null,
  p_driver_log jsonb default null,
  p_transporter_log jsonb default null,
  p_other_log jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_archive_id uuid;
  v_live record;
  v_ownership text;
  v_trip jsonb;
begin
  -- Serialize all close attempts for the same immutable trip id.
  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));

  select * into v_live
  from public.trips
  where id = p_trip_id
  for update;

  if not found then
    select id into v_archive_id
    from public.closed_trips
    where source_trip_id = p_trip_id
       or snapshot->'trip'->>'id' = p_trip_id::text
    order by closed_at desc
    limit 1;
    if v_archive_id is not null then
      return v_archive_id;
    end if;
    raise exception 'Trip is no longer open and no archive was found';
  end if;

  v_trip := coalesce(p_trip_snapshot->'trip', '{}'::jsonb);
  v_ownership := coalesce(v_trip->>'ownership', v_live.ownership, 'own');

  if nullif(btrim(coalesce(p_end_date, '')), '') is null then
    raise exception 'End date is required before closing a trip';
  end if;
  if nullif(btrim(coalesce(v_trip->>'end_time', '')), '') is null then
    raise exception 'End time is required before closing a trip';
  end if;
  if v_ownership in ('own', 'owned')
     and nullif(btrim(coalesce(v_trip->>'odometer_end', '')), '') is null then
    raise exception 'Odometer end is required before closing an own-vehicle trip';
  end if;
  if v_ownership = 'third_party'
     and nullif(btrim(coalesce(p_third_party_vehicle_number, '')), '') is null then
    raise exception 'Third-party vehicle number is required before closing a rented trip';
  end if;

  insert into public.closed_trips (
    trip_code, branch_id, branch_name, vehicle_id, driver_id, transporter_id,
    third_party_vehicle_number, source_trip_id, start_date, end_date,
    total_income, total_expense, net_income, snapshot
  ) values (
    p_trip_code, p_branch_id, p_branch_name, p_vehicle_id, p_driver_id,
    p_transporter_id, p_third_party_vehicle_number, p_trip_id, p_start_date,
    p_end_date, p_total_income, p_total_expense, p_net_income, p_trip_snapshot
  ) returning id into v_archive_id;

  if p_fastag is not null then
    insert into public.fastag_transactions (
      vehicle_id, trip_id, transaction_type, amount, transaction_date, note, trip_code
    ) values (
      nullif(p_fastag->>'vehicle_id', '')::uuid,
      p_trip_id,
      p_fastag->>'transaction_type',
      coalesce(nullif(p_fastag->>'amount', '')::numeric, 0),
      p_fastag->>'transaction_date',
      p_fastag->>'note',
      p_trip_code
    );
  end if;

  if p_vehicle_log is not null then
    insert into public.vehicle_trip_logs (
      trip_code, trip_id, vehicle_id, trip_date, fuel_expense,
      parking_charges, odometer_start, odometer_end
    ) values (
      p_trip_code,
      p_trip_id,
      nullif(p_vehicle_log->>'vehicle_id', '')::uuid,
      nullif(p_vehicle_log->>'trip_date', '')::date,
      coalesce(nullif(p_vehicle_log->>'fuel_expense', '')::numeric, 0),
      coalesce(nullif(p_vehicle_log->>'parking_charges', '')::numeric, 0),
      nullif(p_vehicle_log->>'odometer_start', '')::numeric,
      nullif(p_vehicle_log->>'odometer_end', '')::numeric
    );
  end if;

  if p_driver_log is not null then
    insert into public.driver_expense_logs (
      trip_code, trip_id, driver_id, trip_date, driver_bata, morning_exp, night_exp
    ) values (
      p_trip_code,
      p_trip_id,
      nullif(p_driver_log->>'driver_id', '')::uuid,
      nullif(p_driver_log->>'trip_date', '')::date,
      coalesce(nullif(p_driver_log->>'driver_bata', '')::numeric, 0),
      coalesce(nullif(p_driver_log->>'morning_exp', '')::numeric, 0),
      coalesce(nullif(p_driver_log->>'night_exp', '')::numeric, 0)
    );
  end if;

  if p_transporter_log is not null then
    insert into public.transporter_expense_logs (
      trip_code, trip_id, transporter_id, trip_date, hire_charges, approval_charge
    ) values (
      p_trip_code,
      p_trip_id,
      nullif(p_transporter_log->>'transporter_id', '')::uuid,
      nullif(p_transporter_log->>'trip_date', '')::date,
      coalesce(nullif(p_transporter_log->>'hire_charges', '')::numeric, 0),
      coalesce(nullif(p_transporter_log->>'approval_charge', '')::numeric, 0)
    );
  end if;

  if p_other_log is not null then
    insert into public.other_expense_logs (
      trip_code, trip_id, trip_date, dala_charges, unloading,
      sunday_exp, other_amount, other_details
    ) values (
      p_trip_code,
      p_trip_id,
      nullif(p_other_log->>'trip_date', '')::date,
      coalesce(nullif(p_other_log->>'dala_charges', '')::numeric, 0),
      coalesce(nullif(p_other_log->>'unloading', '')::numeric, 0),
      coalesce(nullif(p_other_log->>'sunday_exp', '')::numeric, 0),
      coalesce(nullif(p_other_log->>'other_amount', '')::numeric, 0),
      coalesce(p_other_log->'other_details', '[]'::jsonb)
    );
  end if;

  delete from public.trip_manifests where trip_id = p_trip_id;
  delete from public.trip_other_income where trip_id = p_trip_id;
  delete from public.trip_expenses where trip_id = p_trip_id;
  delete from public.trips where id = p_trip_id;

  return v_archive_id;
end;
$$;

create or replace function public.reopen_trip_atomic(p_closed_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_closed public.closed_trips%rowtype;
  v_snapshot jsonb;
  v_trip jsonb;
  v_old_trip_id uuid;
  v_new_trip_id uuid;
  v_existing_id uuid;
begin
  select * into v_closed
  from public.closed_trips
  where id = p_closed_id
  for update;

  if not found then
    select id into v_existing_id
    from public.trips
    where reopened_from_closed_id = p_closed_id
    limit 1;
    if v_existing_id is not null then return v_existing_id; end if;
    raise exception 'Closed trip is no longer available';
  end if;

  v_snapshot := coalesce(v_closed.snapshot, '{}'::jsonb);
  v_trip := coalesce(v_snapshot->'trip', '{}'::jsonb);
  v_old_trip_id := nullif(v_trip->>'id', '')::uuid;

  insert into public.trips (
    trip_code, ownership, vehicle_id, driver_id, transporter_id, contract_id,
    start_location_id, end_location_id, start_date, start_time, end_date,
    end_time, odometer_start, odometer_end, notes, branch_id,
    reopened_at, reopened_from_closed_id, third_party_vehicle_number
  ) values (
    coalesce(v_trip->>'trip_code', v_closed.trip_code),
    coalesce(v_trip->>'ownership', 'own'),
    nullif(v_trip->>'vehicle_id', '')::uuid,
    nullif(v_trip->>'driver_id', '')::uuid,
    nullif(v_trip->>'transporter_id', '')::uuid,
    nullif(v_trip->>'contract_id', '')::uuid,
    nullif(v_trip->>'start_location_id', '')::uuid,
    nullif(v_trip->>'end_location_id', '')::uuid,
    v_trip->>'start_date',
    v_trip->>'start_time',
    v_trip->>'end_date',
    v_trip->>'end_time',
    v_trip->>'odometer_start',
    v_trip->>'odometer_end',
    v_trip->>'notes',
    v_closed.branch_id,
    now(),
    p_closed_id,
    v_trip->>'third_party_vehicle_number'
  ) returning id into v_new_trip_id;

  insert into public.trip_manifests (
    trip_id, manifest_number, manifest_date, source_id,
    from_location_id, from_pin_code, to_location_id, to_pin_code,
    weight_kg, quantity
  )
  select
    v_new_trip_id,
    x.manifest_number,
    x.manifest_date,
    x.source_id,
    x.from_location_id,
    x.from_pin_code,
    x.to_location_id,
    x.to_pin_code,
    x.weight_kg,
    x.quantity
  from jsonb_to_recordset(coalesce(v_snapshot->'manifests', '[]'::jsonb)) as x(
    manifest_number text,
    manifest_date date,
    source_id uuid,
    from_location_id uuid,
    from_pin_code text,
    to_location_id uuid,
    to_pin_code text,
    weight_kg text,
    quantity text
  );

  insert into public.trip_other_income (trip_id, income_name, amount, note)
  select v_new_trip_id, x.income_name, x.amount, x.note
  from jsonb_to_recordset(coalesce(v_snapshot->'other_income', '[]'::jsonb)) as x(
    income_name text, amount text, note text
  );

  insert into public.trip_expenses (trip_id, expense_name, amount, note, sort_order)
  select v_new_trip_id, x.expense_name, x.amount, x.note, coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(v_snapshot->'expenses', '[]'::jsonb)) as x(
    expense_name text, amount text, note text, sort_order integer
  );

  if v_old_trip_id is not null then
    update public.approval_charge_advances
    set trip_id = v_new_trip_id
    where trip_code = v_closed.trip_code
      and trip_id = v_old_trip_id;

    delete from public.fastag_transactions where trip_id = v_old_trip_id;
    delete from public.vehicle_trip_logs where trip_id = v_old_trip_id;
    delete from public.driver_expense_logs where trip_id = v_old_trip_id;
    delete from public.other_expense_logs where trip_id = v_old_trip_id;
    delete from public.transporter_expense_logs where trip_id = v_old_trip_id;
  end if;

  delete from public.closed_trips where id = p_closed_id;
  return v_new_trip_id;
end;
$$;

-- These lifecycle functions are server-only. The browser must call the
-- authenticated application server wrappers, never the public Supabase RPC.
revoke all on function public.close_trip_atomic(uuid, jsonb, text, uuid, text, uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.reopen_trip_atomic(uuid) from public, anon, authenticated;
grant execute on function public.close_trip_atomic(uuid, jsonb, text, uuid, text, uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.reopen_trip_atomic(uuid) to service_role;

-- Ending the driver session also persists the operational end fields on the
-- canonical trip. It intentionally does not archive the trip; the dashboard
-- close operation still performs financial snapshotting and deletion atomically.
drop function if exists public.end_driver_trip(text);
create or replace function public.end_driver_trip(
  p_session_token text,
  p_end_date text default null,
  p_end_time text default null,
  p_odometer_end text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link public.driver_trip_links%rowtype;
  v_stored_count integer := 0;
  v_end_date text;
  v_end_time text;
begin
  select * into v_link
  from public.driver_trip_links
  where session_token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and ended_at is null
  for update;
  if not found then raise exception 'Driver session is not active'; end if;

  select count(*) into v_stored_count
  from public.driver_trip_locations
  where link_id = v_link.id and checkpoint_id is not null;
  if v_link.last_checkpoint_verification_at is null
     or v_stored_count <> v_link.verified_checkpoint_count then
    raise exception 'Every checkpoint must be confirmed with Sparrow before ending this trip';
  end if;

  v_end_date := nullif(btrim(p_end_date), '');
  v_end_time := nullif(btrim(p_end_time), '');
  if v_end_date is null then
    v_end_date := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
  end if;
  if v_end_time is null then
    v_end_time := to_char(now() at time zone 'Asia/Kolkata', 'HH24:MI');
  end if;

  update public.trips
  set end_date = v_end_date,
      end_time = v_end_time,
      odometer_end = coalesce(nullif(btrim(p_odometer_end), ''), odometer_end)
  where id = v_link.trip_id;

  update public.driver_trip_links
  set ended_at = now(), last_seen_at = now()
  where id = v_link.id;

  return jsonb_build_object(
    'ok', true,
    'ended_at', now(),
    'trip_id', v_link.trip_id,
    'end_date', v_end_date,
    'end_time', v_end_time,
    'odometer_end', (select odometer_end from public.trips where id = v_link.trip_id)
  );
end;
$$;

revoke all on function public.end_driver_trip(text, text, text, text) from public, anon, authenticated;
grant execute on function public.end_driver_trip(text, text, text, text) to service_role;

create or replace function public.replace_trip_lines_atomic(
  p_trip_id uuid,
  p_income jsonb,
  p_expenses jsonb,
  p_approval jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));
  if not exists (select 1 from public.trips where id = p_trip_id for update) then
    raise exception 'Trip is no longer open';
  end if;

  delete from public.trip_other_income where trip_id = p_trip_id;
  delete from public.trip_expenses where trip_id = p_trip_id;
  delete from public.approval_charge_advances where trip_id = p_trip_id;

  insert into public.trip_other_income (trip_id, income_name, amount, note)
  select p_trip_id, x.income_name, x.amount, x.note
  from jsonb_to_recordset(coalesce(p_income, '[]'::jsonb)) as x(
    income_name text, amount text, note text
  );

  insert into public.trip_expenses (trip_id, expense_name, amount, note, sort_order)
  select p_trip_id, x.expense_name, x.amount, x.note, coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_expenses, '[]'::jsonb)) as x(
    expense_name text, amount text, note text, sort_order integer
  );

  if p_approval is not null then
    insert into public.approval_charge_advances (
      trip_id, trip_code, transporter_id, advance, balance
    ) values (
      p_trip_id,
      p_approval->>'trip_code',
      nullif(p_approval->>'transporter_id', '')::uuid,
      coalesce(nullif(p_approval->>'advance', '')::numeric, 0),
      coalesce(nullif(p_approval->>'balance', '')::numeric, 0)
    );
  end if;
end;
$$;

revoke all on function public.replace_trip_lines_atomic(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_trip_lines_atomic(uuid, jsonb, jsonb, jsonb) to service_role;

commit;
