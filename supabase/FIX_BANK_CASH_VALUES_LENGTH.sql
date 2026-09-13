-- Fix: `VALUES lists must all be the same length` when creating Bank/Cash accounts.
-- Run this complete script in the Supabase SQL Editor.
-- This is not a user-input length restriction. The deployed trigger functions had
-- two-row VALUES clauses where row 2 omitted the bank_account_id/cash_account_id
-- value. The fix uses separate INSERT statements with matching column/value lists.

begin;

-- The Cash master must contain the same opening-balance fields used by the UI
-- and trigger functions.
alter table public.cash_accounts
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists opening_balance_date date;

create or replace function public.sync_bank_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_capital_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.account_holder_name, new.bank_name, 'Bank account'))
    || ' / ' || trim(coalesce(new.bank_name, 'Bank'))
    || ' (' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_capital_id
  from public.ledger_accounts
  where branch_id = new.branch_id and is_default_capital;

  insert into public.ledger_accounts (
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_bank_account_id, opening_balance, opening_balance_date,
    opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'bank', 'bank', new.id,
    v_amount, new.opening_balance_date, 'dr', true,
    coalesce(new.status, 'active') = 'active'
  )
  on conflict (source_bank_account_id) where source_bank_account_id is not null
  do update set
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
    insert into public.journal_entries (
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      new.opening_balance_date, new.branch_id, 'Opening balance - ' || v_name,
      'account_opening:bank:' || new.id::text, 'auto', 'approved', now()
    ) returning id into v_entry_id;

    insert into public.journal_lines (
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      bank_account_id, line_description, debit, credit
    ) values (
      v_entry_id, 1, new.branch_id, v_ledger_id, 'bank', new.id,
      'Bank opening balance', v_amount, 0
    );

    insert into public.journal_lines (
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 2, new.branch_id, v_capital_id, 'ledger',
      'Opening balance credited to Capital', 0, v_amount
    );
  end if;
  return new;
end;
$$;

create or replace function public.sync_cash_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_capital_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.responsible_person, 'Cash account'))
    || ' (Cash / ' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_capital_id
  from public.ledger_accounts
  where branch_id = new.branch_id and is_default_capital;

  insert into public.ledger_accounts (
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_cash_account_id, opening_balance, opening_balance_date,
    opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'cash', 'cash', new.id,
    v_amount, new.opening_balance_date, 'dr', true, true
  )
  on conflict (source_cash_account_id) where source_cash_account_id is not null
  do update set
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
    insert into public.journal_entries (
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      new.opening_balance_date, new.branch_id, 'Opening balance - ' || v_name,
      'account_opening:cash:' || new.id::text, 'auto', 'approved', now()
    ) returning id into v_entry_id;

    insert into public.journal_lines (
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      cash_account_id, line_description, debit, credit
    ) values (
      v_entry_id, 1, new.branch_id, v_ledger_id, 'cash', new.id,
      'Cash opening balance', v_amount, 0
    );

    insert into public.journal_lines (
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 2, new.branch_id, v_capital_id, 'ledger',
      'Opening balance credited to Capital', 0, v_amount
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bank_accounts_sync_ledger on public.bank_accounts;
create trigger bank_accounts_sync_ledger
after insert or update of branch_id, account_holder_name, bank_name,
  opening_balance, opening_balance_date, status
on public.bank_accounts
for each row execute function public.sync_bank_account_ledger();

drop trigger if exists cash_accounts_sync_ledger on public.cash_accounts;
create trigger cash_accounts_sync_ledger
after insert or update of branch_id, responsible_person,
  opening_balance, opening_balance_date
on public.cash_accounts
for each row execute function public.sync_cash_account_ledger();

grant execute on function public.sync_bank_account_ledger() to anon, authenticated;
grant execute on function public.sync_cash_account_ledger() to anon, authenticated;

-- Verification: every row below has a matching column/value count by construction.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('bank_accounts', 'cash_accounts')
  and column_name in ('opening_balance', 'opening_balance_date')
order by table_name, column_name;

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('bank_accounts_sync_ledger', 'cash_accounts_sync_ledger')
order by event_object_table;

commit;
notify pgrst, 'reload schema';
