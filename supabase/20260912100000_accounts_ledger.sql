-- Accounts > Ledger
-- Adds manual revenue/capital ledgers, automatic bank/cash ledgers, opening
-- balance journal entries, and the period-ledger data model.
-- Run this once in the Supabase SQL editor. It is safe to run repeatedly.

begin;

create extension if not exists pgcrypto;

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  account_name text not null,
  account_type text,
  description text not null default '',
  ledger_type text not null check (ledger_type in ('revenue', 'capital', 'bank', 'cash')),
  account_kind text not null default 'ledger' check (account_kind in ('ledger', 'bank', 'cash')),
  source_bank_account_id uuid references public.bank_accounts(id) on delete set null,
  source_cash_account_id uuid references public.cash_accounts(id) on delete set null,
  opening_balance numeric(14,2) not null default 0,
  opening_balance_date date,
  opening_balance_side text not null default 'dr' check (opening_balance_side in ('dr', 'cr')),
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, account_name)
);

-- Backfill columns when an earlier Accounts journal migration already exists.
alter table public.ledger_accounts add column if not exists account_type text;
alter table public.ledger_accounts add column if not exists description text not null default '';
alter table public.ledger_accounts add column if not exists ledger_type text;
alter table public.ledger_accounts add column if not exists account_kind text not null default 'ledger';
alter table public.ledger_accounts add column if not exists source_bank_account_id uuid references public.bank_accounts(id) on delete set null;
alter table public.ledger_accounts add column if not exists source_cash_account_id uuid references public.cash_accounts(id) on delete set null;
alter table public.ledger_accounts add column if not exists opening_balance numeric(14,2) not null default 0;
alter table public.ledger_accounts add column if not exists opening_balance_date date;
alter table public.ledger_accounts add column if not exists opening_balance_side text not null default 'dr';
alter table public.ledger_accounts add column if not exists is_system boolean not null default false;
alter table public.ledger_accounts add column if not exists is_active boolean not null default true;
alter table public.ledger_accounts add column if not exists updated_at timestamptz not null default now();

update public.ledger_accounts
set ledger_type = case
  when coalesce(account_type, '') in ('revenue', 'capital') then account_type
  else 'capital'
end
where ledger_type is null;
update public.ledger_accounts set description = account_name where description = '';
update public.ledger_accounts set account_kind = 'ledger' where account_kind is null;
update public.ledger_accounts set opening_balance_side = 'dr' where opening_balance_side is null;
alter table public.ledger_accounts alter column ledger_type set not null;

create unique index if not exists ledger_accounts_bank_source_uidx
  on public.ledger_accounts(source_bank_account_id) where source_bank_account_id is not null;
create unique index if not exists ledger_accounts_cash_source_uidx
  on public.ledger_accounts(source_cash_account_id) where source_cash_account_id is not null;
create index if not exists ledger_accounts_branch_active_idx
  on public.ledger_accounts(branch_id, is_active, ledger_type);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  voucher_number text not null unique default ('JV-' || to_char(now(), 'YYYYMMDDHH24MISSMS')),
  entry_date date not null default current_date,
  branch_id uuid references public.branches(id) on delete restrict,
  description text not null,
  reference text,
  source_module text not null default 'manual' check (source_module in ('manual','auto','inter_branch','tms','cash_reports')),
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  line_no integer not null default 1,
  branch_id uuid references public.branches(id) on delete restrict,
  ledger_account_id uuid references public.ledger_accounts(id) on delete restrict,
  account_kind text check (account_kind in ('ledger','bank','cash')),
  bank_account_id uuid references public.bank_accounts(id) on delete restrict,
  cash_account_id uuid references public.cash_accounts(id) on delete restrict,
  line_description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  unique (journal_entry_id, line_no)
);

create index if not exists journal_entries_date_branch_idx
  on public.journal_entries(entry_date, branch_id);
create index if not exists journal_lines_ledger_idx
  on public.journal_lines(ledger_account_id, journal_entry_id);

create or replace function public.set_ledger_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ledger_accounts_updated_at on public.ledger_accounts;
create trigger ledger_accounts_updated_at
before update on public.ledger_accounts
for each row execute function public.set_ledger_updated_at();

drop function if exists public.create_manual_ledger(uuid, text, text, numeric, date, text);
create or replace function public.create_manual_ledger(
  p_branch_id uuid,
  p_ledger_type text,
  p_description text,
  p_opening_balance numeric,
  p_opening_balance_date date,
  p_opening_balance_side text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(p_opening_balance, 0)), 2);
  v_side text := lower(coalesce(p_opening_balance_side, 'dr'));
  v_name text := nullif(trim(p_description), '');
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if p_ledger_type not in ('revenue', 'capital') then
    raise exception 'Manual ledger type must be revenue or capital';
  end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  if p_opening_balance_date is null then raise exception 'Opening balance date is required'; end if;
  if v_side not in ('dr', 'cr') then raise exception 'Opening balance side must be dr or cr'; end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    opening_balance, opening_balance_date, opening_balance_side, is_system, is_active
  ) values (
    p_branch_id, v_name, p_ledger_type, v_name, p_ledger_type, 'ledger',
    v_amount, p_opening_balance_date, v_side, false, true
  ) returning id into v_ledger_id;

  if v_amount > 0 then
    insert into public.journal_entries(
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      p_opening_balance_date,
      p_branch_id,
      'Opening balance - ' || v_name,
      'ledger_opening:' || v_ledger_id::text,
      'auto',
      'approved',
      now()
    ) returning id into v_entry_id;

    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id,
      account_kind, line_description, debit, credit
    ) values (
      v_entry_id, 1, p_branch_id, v_ledger_id, 'ledger',
      'Opening balance - ' || v_name,
      case when v_side = 'dr' then v_amount else 0 end,
      case when v_side = 'cr' then v_amount else 0 end
    );

    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 2, p_branch_id, 'ledger',
      'Opening balance offset',
      case when v_side = 'cr' then v_amount else 0 end,
      case when v_side = 'dr' then v_amount else 0 end
    );
  end if;

  return v_ledger_id;
end;
$$;

drop function if exists public.sync_bank_account_ledger();
create or replace function public.sync_bank_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.account_holder_name, new.bank_name, 'Bank account')) ||
    ' / ' || trim(coalesce(new.bank_name, 'Bank')) || ' (' ||
    coalesce((select branch_name from public.branches where id = new.branch_id), 'Branch') || ')';
begin
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_bank_account_id, opening_balance, opening_balance_date,
    opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'bank', 'bank', new.id,
    v_amount, new.opening_balance_date, 'dr', true,
    coalesce(new.status, 'active') = 'active'
  )
  on conflict (source_bank_account_id) where source_bank_account_id is not null do update set
    branch_id = excluded.branch_id,
    account_name = excluded.account_name,
    description = excluded.description,
    opening_balance = excluded.opening_balance,
    opening_balance_date = excluded.opening_balance_date,
    is_active = excluded.is_active
  returning id into v_ledger_id;

  delete from public.journal_entries
  where reference = 'account_opening:bank:' || new.id::text
    and source_module = 'auto';

  if new.opening_balance_date is not null and v_amount > 0 then
    insert into public.journal_entries(
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      new.opening_balance_date, new.branch_id,
      'Opening balance - ' || v_name,
      'account_opening:bank:' || new.id::text,
      'auto', 'approved', now()
    ) returning id into v_entry_id;
    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      bank_account_id, line_description, debit, credit
    ) values (
      v_entry_id, 1, new.branch_id, v_ledger_id, 'bank', new.id,
      'Opening balance - ' || v_name, v_amount, 0
    );
    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 2, new.branch_id, 'ledger', 'Opening balance offset', 0, v_amount
    );
  end if;
  return new;
end;
$$;

drop function if exists public.sync_cash_account_ledger();
create or replace function public.sync_cash_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.responsible_person, 'Cash account')) || ' (Cash / ' ||
    coalesce((select branch_name from public.branches where id = new.branch_id), 'Branch') || ')';
begin
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_cash_account_id, opening_balance, opening_balance_date,
    opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'cash', 'cash', new.id,
    v_amount, new.opening_balance_date, 'dr', true, true
  )
  on conflict (source_cash_account_id) where source_cash_account_id is not null do update set
    branch_id = excluded.branch_id,
    account_name = excluded.account_name,
    description = excluded.description,
    opening_balance = excluded.opening_balance,
    opening_balance_date = excluded.opening_balance_date,
    is_active = true
  returning id into v_ledger_id;

  delete from public.journal_entries
  where reference = 'account_opening:cash:' || new.id::text
    and source_module = 'auto';

  if new.opening_balance_date is not null and v_amount > 0 then
    insert into public.journal_entries(
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      new.opening_balance_date, new.branch_id,
      'Opening balance - ' || v_name,
      'account_opening:cash:' || new.id::text,
      'auto', 'approved', now()
    ) returning id into v_entry_id;
    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      cash_account_id, line_description, debit, credit
    ) values (
      v_entry_id, 1, new.branch_id, v_ledger_id, 'cash', new.id,
      'Opening balance - ' || v_name, v_amount, 0
    );
    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 2, new.branch_id, 'ledger', 'Opening balance offset', 0, v_amount
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bank_accounts_sync_ledger on public.bank_accounts;
create trigger bank_accounts_sync_ledger
after insert or update of branch_id, account_holder_name, bank_name, opening_balance, opening_balance_date, status
on public.bank_accounts
for each row execute function public.sync_bank_account_ledger();

drop trigger if exists cash_accounts_sync_ledger on public.cash_accounts;
create trigger cash_accounts_sync_ledger
after insert or update of branch_id, responsible_person, opening_balance, opening_balance_date
on public.cash_accounts
for each row execute function public.sync_cash_account_ledger();

-- Backfill existing Masters records with the same idempotent behavior as the
-- insert/update triggers. This function can also be run again safely later.
create or replace function public.backfill_account_ledgers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_ledger_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2);
  v_name text;
begin
  for r in select * from public.bank_accounts loop
    v_amount := round(abs(coalesce(r.opening_balance, 0)), 2);
    v_name := trim(coalesce(r.account_holder_name, r.bank_name, 'Bank account')) ||
      ' / ' || trim(coalesce(r.bank_name, 'Bank')) || ' (' ||
      coalesce((select branch_name from public.branches where id = r.branch_id), 'Branch') || ')';
    insert into public.ledger_accounts(
      branch_id, account_name, account_type, description, ledger_type, account_kind,
      source_bank_account_id, opening_balance, opening_balance_date,
      opening_balance_side, is_system, is_active
    ) values (
      r.branch_id, v_name, 'asset', v_name, 'bank', 'bank', r.id,
      v_amount, r.opening_balance_date, 'dr', true,
      coalesce(r.status, 'active') = 'active'
    )
    on conflict (source_bank_account_id) where source_bank_account_id is not null do update set
      branch_id=excluded.branch_id,
      account_name=excluded.account_name,
      description=excluded.description,
      opening_balance=excluded.opening_balance,
      opening_balance_date=excluded.opening_balance_date,
      is_active=excluded.is_active
    returning id into v_ledger_id;

    if r.opening_balance_date is not null and v_amount > 0
       and not exists (
         select 1 from public.journal_entries
         where reference='account_opening:bank:'||r.id::text
       ) then
      insert into public.journal_entries(
        entry_date, branch_id, description, reference, source_module, status, approved_at
      ) values (
        r.opening_balance_date, r.branch_id, 'Opening balance - '||v_name,
        'account_opening:bank:'||r.id::text, 'auto', 'approved', now()
      ) returning id into v_entry_id;
      insert into public.journal_lines(
        journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
        bank_account_id, line_description, debit, credit
      ) values (
        v_entry_id, 1, r.branch_id, v_ledger_id, 'bank', r.id,
        'Opening balance - '||v_name, v_amount, 0
      );
      insert into public.journal_lines(
        journal_entry_id, line_no, branch_id, account_kind,
        line_description, debit, credit
      ) values (
        v_entry_id, 2, r.branch_id, 'ledger',
        'Opening balance offset', 0, v_amount
      );
    end if;
  end loop;

  for r in select * from public.cash_accounts loop
    v_amount := round(abs(coalesce(r.opening_balance, 0)), 2);
    v_name := trim(coalesce(r.responsible_person, 'Cash account')) || ' (Cash / ' ||
      coalesce((select branch_name from public.branches where id = r.branch_id), 'Branch') || ')';
    insert into public.ledger_accounts(
      branch_id, account_name, account_type, description, ledger_type, account_kind,
      source_cash_account_id, opening_balance, opening_balance_date,
      opening_balance_side, is_system, is_active
    ) values (
      r.branch_id, v_name, 'asset', v_name, 'cash', 'cash', r.id,
      v_amount, r.opening_balance_date, 'dr', true, true
    )
    on conflict (source_cash_account_id) where source_cash_account_id is not null do update set
      branch_id=excluded.branch_id,
      account_name=excluded.account_name,
      description=excluded.description,
      opening_balance=excluded.opening_balance,
      opening_balance_date=excluded.opening_balance_date,
      is_active=true
    returning id into v_ledger_id;

    if r.opening_balance_date is not null and v_amount > 0
       and not exists (
         select 1 from public.journal_entries
         where reference='account_opening:cash:'||r.id::text
       ) then
      insert into public.journal_entries(
        entry_date, branch_id, description, reference, source_module, status, approved_at
      ) values (
        r.opening_balance_date, r.branch_id, 'Opening balance - '||v_name,
        'account_opening:cash:'||r.id::text, 'auto', 'approved', now()
      ) returning id into v_entry_id;
      insert into public.journal_lines(
        journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
        cash_account_id, line_description, debit, credit
      ) values (
        v_entry_id, 1, r.branch_id, v_ledger_id, 'cash', r.id,
        'Opening balance - '||v_name, v_amount, 0
      );
      insert into public.journal_lines(
        journal_entry_id, line_no, branch_id, account_kind,
        line_description, debit, credit
      ) values (
        v_entry_id, 2, r.branch_id, 'ledger',
        'Opening balance offset', 0, v_amount
      );
    end if;
  end loop;
end;
$$;

select public.backfill_account_ledgers();


grant select, insert, update on public.ledger_accounts to anon, authenticated;
grant select, insert, update on public.journal_entries to anon, authenticated;
grant select, insert, update on public.journal_lines to anon, authenticated;
grant execute on function public.create_manual_ledger(uuid, text, text, numeric, date, text) to anon, authenticated;
grant execute on function public.sync_bank_account_ledger() to anon, authenticated;
grant execute on function public.sync_cash_account_ledger() to anon, authenticated;
grant execute on function public.backfill_account_ledgers() to anon, authenticated;

alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
drop policy if exists accounts_ledger_open_access on public.ledger_accounts;
create policy accounts_ledger_open_access on public.ledger_accounts for all to anon, authenticated using (true) with check (true);
drop policy if exists accounts_journal_entries_open_access on public.journal_entries;
create policy accounts_journal_entries_open_access on public.journal_entries for all to anon, authenticated using (true) with check (true);
drop policy if exists accounts_journal_lines_open_access on public.journal_lines;
create policy accounts_journal_lines_open_access on public.journal_lines for all to anon, authenticated using (true) with check (true);

commit;

-- Run this once after the migration if the database already contains bank/cash masters:
-- select public.backfill_account_ledgers();

-- Verification queries.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('ledger_accounts','journal_entries','journal_lines')
order by table_name;
select trigger_name, event_object_table from information_schema.triggers
where trigger_schema = 'public' and trigger_name in ('bank_accounts_sync_ledger','cash_accounts_sync_ledger')
order by event_object_table;
