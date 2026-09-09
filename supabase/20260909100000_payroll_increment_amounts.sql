-- Payroll one-time increment amounts
-- Apply this migration in Supabase when the application change is approved.
create table if not exists public.increment_amounts (
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
  add column if not exists increment_amount numeric(14,2) not null default 0;

create index if not exists increment_amounts_employee_status_idx
  on public.increment_amounts (employee_id, status);
create index if not exists increment_amounts_payroll_idx
  on public.increment_amounts (payroll_id);

do $$ begin
  create trigger hr_increment_amounts_updated_at
  before update on public.increment_amounts
  for each row execute function public.hr_set_updated_at();
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.increment_amounts to anon, authenticated;
alter table public.increment_amounts enable row level security;
drop policy if exists "hr anon and authenticated increment access" on public.increment_amounts;
create policy "hr anon and authenticated increment access"
  on public.increment_amounts for all to anon, authenticated
  using (true) with check (true);

comment on table public.increment_amounts is 'One-time positive payroll additions; pending rows are consumed once by payroll generation.';
comment on column public.payrolls.increment_amount is 'One-time increment total snapshotted into this payroll.';
