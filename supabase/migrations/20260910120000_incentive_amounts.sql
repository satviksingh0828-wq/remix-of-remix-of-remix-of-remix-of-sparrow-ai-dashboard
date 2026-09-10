-- Create the one-time payroll incentives table used by the HR payroll UI.
-- This migration is intentionally idempotent so it also repairs deployments where
-- the earlier standalone incentive SQL files were not applied.

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

alter table public.payrolls
  add column if not exists incentive_amount numeric(14,2) not null default 0;

create index if not exists incentive_amounts_employee_status_idx
  on public.incentive_amounts (employee_id, status);

create index if not exists incentive_amounts_payroll_idx
  on public.incentive_amounts (payroll_id);

drop trigger if exists incentive_amounts_updated_at on public.incentive_amounts;
create trigger incentive_amounts_updated_at
  before update on public.incentive_amounts
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.incentive_amounts to anon, authenticated;
alter table public.incentive_amounts enable row level security;
drop policy if exists "hr anon and authenticated incentive access" on public.incentive_amounts;
create policy "hr anon and authenticated incentive access"
  on public.incentive_amounts for all to anon, authenticated
  using (true) with check (true);

-- Realtime is optional; do not fail the migration if the publication is managed
-- differently by the hosted Supabase project.
do $$ begin
  alter publication supabase_realtime add table public.incentive_amounts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on table public.incentive_amounts is
  'One-time positive payroll incentives; pending rows are consumed once by payroll generation.';
comment on column public.payrolls.incentive_amount is
  'One-time incentive total snapshotted into this payroll.';
