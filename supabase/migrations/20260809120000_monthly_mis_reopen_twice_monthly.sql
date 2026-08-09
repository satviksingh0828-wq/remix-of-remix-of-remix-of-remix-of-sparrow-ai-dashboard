alter table public.monthly_mis_activities
  add column if not exists schedule_value_2 smallint;

alter table public.monthly_mis_activities
  drop constraint if exists monthly_mis_schedule_value_check;

-- Sundays are no longer valid MIS due days. Move any legacy Sunday weekly
-- schedule to Monday so the migration remains safe for existing installations.
update public.monthly_mis_activities
set schedule_value = 1, updated_at = now()
where schedule_type = 'weekly' and schedule_value = 0;

alter table public.monthly_mis_activities
  add constraint monthly_mis_schedule_value_check check (
    (schedule_type = 'daily' and schedule_value is null and schedule_value_2 is null) or
    (schedule_type = 'weekly' and schedule_value between 1 and 6 and schedule_value_2 is null) or
    (schedule_type = 'day_of_month' and schedule_value between 1 and 31 and schedule_value_2 is null) or
    (schedule_type = 'twice_monthly' and schedule_value between 1 and 31
      and schedule_value_2 between 1 and 31 and schedule_value <> schedule_value_2)
  );

alter table public.monthly_mis_activities
  drop constraint if exists monthly_mis_activities_schedule_type_check;

alter table public.monthly_mis_activities
  add constraint monthly_mis_activities_schedule_type_check
  check (schedule_type in ('daily', 'weekly', 'day_of_month', 'twice_monthly'));

-- Admin authorization is enforced by the server function before this narrowly
-- defined submitted-to-draft transition reaches the service-role database client.
create or replace function public.protect_submitted_monthly_mis()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.status = 'submitted' and not (
    tg_op = 'UPDATE'
    and new.status = 'draft'
    and new.snapshot is null
    and new.submitted_at is null
    and new.submitted_by is null
    and new.draft_data is not null
  ) then
    raise exception 'Submitted Monthly MIS records are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
