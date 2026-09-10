-- Payroll incentives: verify and repair script
-- Run this entire script once in Supabase SQL Editor.
-- It is safe to run repeatedly.

begin;

-- Preserve data from the earlier Increment naming if that table exists.
do $$
begin
  if to_regclass('public.increment_amounts') is not null
     and to_regclass('public.incentive_amounts') is null then
    alter table public.increment_amounts rename to incentive_amounts;
  end if;
end
$$;

-- Preserve the earlier payroll column name if it exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payrolls'
      and column_name = 'increment_amount'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payrolls'
      and column_name = 'incentive_amount'
  ) then
    alter table public.payrolls rename column increment_amount to incentive_amount;
  end if;
end
$$;

-- Create the table if it is missing.
create table if not exists public.incentive_amounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'added', 'paid')),
  payroll_id uuid references public.payrolls(id) on delete set null,
  added_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair missing columns if the table existed but was incomplete.
alter table public.incentive_amounts add column if not exists employee_id uuid;
alter table public.incentive_amounts add column if not exists amount numeric(14,2);
alter table public.incentive_amounts add column if not exists reason text;
alter table public.incentive_amounts add column if not exists status text default 'pending';
alter table public.incentive_amounts add column if not exists payroll_id uuid;
alter table public.incentive_amounts add column if not exists added_on date;
alter table public.incentive_amounts add column if not exists created_at timestamptz default now();
alter table public.incentive_amounts add column if not exists updated_at timestamptz default now();

-- Add the payroll snapshot column if it is missing.
alter table public.payrolls
  add column if not exists incentive_amount numeric(14,2) not null default 0;

create index if not exists incentive_amounts_employee_status_idx
  on public.incentive_amounts (employee_id, status);

create index if not exists incentive_amounts_payroll_idx
  on public.incentive_amounts (payroll_id);

-- Keep updated_at current when incentive rows change.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists incentive_amounts_updated_at on public.incentive_amounts;
    create trigger incentive_amounts_updated_at
      before update on public.incentive_amounts
      for each row execute function public.set_updated_at();
  end if;
end
$$;

grant select, insert, update, delete on public.incentive_amounts to anon, authenticated;
alter table public.incentive_amounts enable row level security;
drop policy if exists "hr anon and authenticated incentive access" on public.incentive_amounts;
create policy "hr anon and authenticated incentive access"
  on public.incentive_amounts for all to anon, authenticated
  using (true) with check (true);

-- Realtime registration is optional; do not fail the repair if the publication
-- is unavailable or the table is already registered.
do $$
begin
  alter publication supabase_realtime add table public.incentive_amounts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

commit;

-- Verification output: these queries should return rows.
select
  'incentive_amounts table' as check_name,
  to_regclass('public.incentive_amounts') as result;

select
  'payrolls.incentive_amount column' as check_name,
  column_name as result
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payrolls'
  and column_name = 'incentive_amount';

select
  'incentive_amounts columns' as check_name,
  string_agg(column_name, ', ' order by ordinal_position) as result
from information_schema.columns
where table_schema = 'public'
  and table_name = 'incentive_amounts';

select
  'incentive_amounts row count' as check_name,
  count(*)::text as result
from public.incentive_amounts;
