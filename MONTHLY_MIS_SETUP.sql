-- Monthly MIS database setup
-- Run once in the Supabase SQL editor. The application accesses these tables only
-- from authenticated server functions using the service-role client.

create extension if not exists pgcrypto;

create table if not exists public.monthly_mis_activities (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  activity_name text not null check (length(trim(activity_name)) between 1 and 200),
  schedule_type text not null check (schedule_type in ('daily', 'weekly', 'day_of_month', 'twice_monthly')),
  schedule_value smallint,
  schedule_value_2 smallint,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id) on delete set null,
  constraint monthly_mis_schedule_value_check check (
    (schedule_type = 'daily' and schedule_value is null and schedule_value_2 is null) or
    (schedule_type = 'weekly' and schedule_value between 1 and 6 and schedule_value_2 is null) or
    (schedule_type = 'day_of_month' and schedule_value between 1 and 31 and schedule_value_2 is null) or
    (schedule_type = 'twice_monthly' and schedule_value between 1 and 31
      and schedule_value_2 between 1 and 31 and schedule_value <> schedule_value_2)
  )
);

create index if not exists monthly_mis_activities_branch_active_idx
  on public.monthly_mis_activities(branch_id, is_active, sort_order);

create table if not exists public.monthly_mis_instances (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  mis_month date not null check (extract(day from mis_month) = 1),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  draft_data jsonb,
  snapshot jsonb,
  submitted_at timestamptz,
  submitted_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_mis_one_per_branch_month unique (branch_id, mis_month),
  constraint monthly_mis_submission_shape check (
    (status = 'draft' and snapshot is null and submitted_at is null) or
    (status = 'submitted' and snapshot is not null and submitted_at is not null)
  )
);

create index if not exists monthly_mis_instances_month_status_idx
  on public.monthly_mis_instances(mis_month, status, branch_id);

-- A submitted record is immutable. This makes the snapshot a reliable audit record
-- even if a future application bug attempts to update or delete it.
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

drop trigger if exists protect_submitted_monthly_mis_update on public.monthly_mis_instances;
create trigger protect_submitted_monthly_mis_update
  before update on public.monthly_mis_instances for each row
  execute function public.protect_submitted_monthly_mis();

drop trigger if exists protect_submitted_monthly_mis_delete on public.monthly_mis_instances;
create trigger protect_submitted_monthly_mis_delete
  before delete on public.monthly_mis_instances for each row
  execute function public.protect_submitted_monthly_mis();

alter table public.monthly_mis_activities enable row level security;
alter table public.monthly_mis_instances enable row level security;

-- Deny direct browser access. Server functions validate the signed application
-- session, role, active session token, and branch assignment before using service role.
revoke all on public.monthly_mis_activities from anon, authenticated;
revoke all on public.monthly_mis_instances from anon, authenticated;
grant all on public.monthly_mis_activities to service_role;
grant all on public.monthly_mis_instances to service_role;

comment on table public.monthly_mis_activities is 'Live, branch-specific Monthly MIS form configuration.';
comment on table public.monthly_mis_instances is 'One draft/submission per branch and month; submitted snapshot is immutable.';

-- Existing notifications.kind columns are text in the standard setup. If your
-- project added a CHECK constraint, extend it to include 'monthly_mis'.
