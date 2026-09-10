-- Garuda Logistics: Accounts > Bank/Cash masters repair
-- Run this entire script in Supabase SQL Editor.
-- It is safe to run repeatedly and returns verification rows at the end.
-- The frontend uses the project's existing custom app session, so it must retain
-- anon table access; UI routes separately restrict Accounts to admin/semi_admin/viewer.

begin;

create extension if not exists pgcrypto;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  account_holder_name text not null,
  bank_name text not null,
  account_number text not null,
  ifsc_code text not null,
  bank_branch_name text not null,
  account_type text not null default 'savings' check (account_type in ('savings', 'current')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  opening_date date,
  opening_balance numeric(14,2) not null default 0,
  opening_balance_date date,
  current_balance numeric(14,2) not null default 0,
  current_balance_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  responsible_person text not null,
  responsible_person_mobile text not null,
  email text,
  address text,
  responsible_person_branch text,
  current_balance numeric(14,2) not null default 0,
  current_balance_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_accounts_branch_id_idx on public.bank_accounts(branch_id);
create index if not exists cash_accounts_branch_id_idx on public.cash_accounts(branch_id);

create or replace function public.set_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_accounts_updated_at();

drop trigger if exists cash_accounts_set_updated_at on public.cash_accounts;
create trigger cash_accounts_set_updated_at
before update on public.cash_accounts
for each row execute function public.set_accounts_updated_at();

-- The app currently authenticates through its own app_users/session system,
-- not Supabase Auth. Keep these grants until the app is migrated to auth.uid().
grant select, insert, update, delete on public.bank_accounts to anon, authenticated;
grant select, insert, update, delete on public.cash_accounts to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.bank_accounts enable row level security;
alter table public.cash_accounts enable row level security;

drop policy if exists "accounts bank anon and authenticated access" on public.bank_accounts;
create policy "accounts bank anon and authenticated access"
on public.bank_accounts
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "accounts cash anon and authenticated access" on public.cash_accounts;
create policy "accounts cash anon and authenticated access"
on public.cash_accounts
for all to anon, authenticated
using (true)
with check (true);

commit;

-- Verification: both tables must return rows with the expected column count.
select table_name, count(*) as column_count
from information_schema.columns
where table_schema = 'public'
  and table_name in ('bank_accounts', 'cash_accounts')
group by table_name
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('bank_accounts', 'cash_accounts')
order by table_name, ordinal_position;
