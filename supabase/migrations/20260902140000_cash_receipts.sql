-- Cash recognition for closed-trip freight/loading and approval charges.
-- A stable source_key makes imports/upserts idempotent and prevents duplicate cash entries.
create table if not exists public.freight_loading_receipts (
  id uuid primary key default gen_random_uuid(),
  closed_trip_id uuid not null references public.closed_trips(id) on delete cascade,
  source_key text not null,
  trip_code text not null,
  manifest_number text,
  branch_id uuid references public.branches(id) on delete restrict,
  freight_amount numeric(14,2) not null default 0 check (freight_amount >= 0),
  loading_amount numeric(14,2) not null default 0 check (loading_amount >= 0),
  is_received boolean not null default false,
  received_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closed_trip_id, source_key),
  check ((is_received and received_date is not null) or (not is_received and received_date is null))
);

create table if not exists public.approval_charge_receipts (
  id uuid primary key default gen_random_uuid(),
  closed_trip_id uuid not null references public.closed_trips(id) on delete cascade,
  source_key text not null,
  trip_code text not null,
  branch_id uuid references public.branches(id) on delete restrict,
  income_name text not null default 'Approval Charge',
  amount numeric(14,2) not null check (amount >= 0),
  is_received boolean not null default false,
  received_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (closed_trip_id, source_key),
  check ((is_received and received_date is not null) or (not is_received and received_date is null))
);

create index if not exists freight_loading_receipts_cash_idx
  on public.freight_loading_receipts (is_received, received_date, branch_id);
create index if not exists approval_charge_receipts_cash_idx
  on public.approval_charge_receipts (is_received, received_date, branch_id);

alter table public.freight_loading_receipts enable row level security;
alter table public.approval_charge_receipts enable row level security;
drop policy if exists "app can manage freight loading receipts" on public.freight_loading_receipts;
create policy "app can manage freight loading receipts" on public.freight_loading_receipts
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "app can manage approval charge receipts" on public.approval_charge_receipts;
create policy "app can manage approval charge receipts" on public.approval_charge_receipts
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists freight_loading_receipts_updated_at on public.freight_loading_receipts;
create trigger freight_loading_receipts_updated_at before update on public.freight_loading_receipts
  for each row execute function public.set_updated_at();
drop trigger if exists approval_charge_receipts_updated_at on public.approval_charge_receipts;
create trigger approval_charge_receipts_updated_at before update on public.approval_charge_receipts
  for each row execute function public.set_updated_at();

-- Older builds wrote Fastag recharges into Operations expenditure. Remove those
-- shadow rows: fastag_transactions is the single source for recharge cash-out.
-- Some databases never received the older Fastag migration, so create the marker
-- defensively before using it. This also keeps the Cash Ledger query compatible.
alter table public.expenditures
  add column if not exists is_fastag_recharge boolean not null default false;
create index if not exists idx_expenditures_fastag_recharge
  on public.expenditures(is_fastag_recharge) where is_fastag_recharge = true;
delete from public.expenditures where is_fastag_recharge = true;
