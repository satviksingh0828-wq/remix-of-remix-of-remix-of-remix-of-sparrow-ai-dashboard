begin;

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
