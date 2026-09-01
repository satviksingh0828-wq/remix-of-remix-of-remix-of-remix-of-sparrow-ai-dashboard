-- Manual cash movements are kept separately from Operations records. The Cash
-- Ledger report combines these entries with paid/received Operations and trip rows.
create table if not exists public.cash_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  entry_date date not null,
  entry_type text not null check (entry_type in ('refill', 'withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_ledger_entries_branch_date_idx
  on public.cash_ledger_entries(branch_id, entry_date desc);

alter table public.cash_ledger_entries enable row level security;

drop policy if exists "Allow all access to cash_ledger_entries" on public.cash_ledger_entries;
create policy "Allow all access to cash_ledger_entries"
  on public.cash_ledger_entries for all to anon, authenticated
  using (true) with check (true);

drop trigger if exists cash_ledger_entries_updated_at on public.cash_ledger_entries;
create trigger cash_ledger_entries_updated_at
  before update on public.cash_ledger_entries
  for each row execute function public.set_updated_at();
