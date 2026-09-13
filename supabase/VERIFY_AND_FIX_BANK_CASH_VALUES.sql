-- Verify and repair Bank/Cash account creation errors.
-- Run this entire script in the Supabase SQL Editor for the target project.
-- It is idempotent: safe to run more than once.

begin;

-- 1) Verify the live table columns before changing anything.
select
  table_name,
  count(*) as column_count,
  string_agg(column_name, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('bank_accounts', 'cash_accounts')
group by table_name
order by table_name;

-- 2) cash_accounts was created without these fields, but the UI and its
--    ledger-sync trigger both use them. Add them without affecting existing rows.
alter table public.cash_accounts
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists opening_balance_date date;

-- 3) Confirm the required input columns now exist.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'bank_accounts' and column_name in (
      'branch_id', 'account_holder_name', 'bank_name', 'account_number',
      'ifsc_code', 'bank_branch_name', 'account_type', 'status',
      'opening_date', 'opening_balance', 'opening_balance_date'
    ))
    or
    (table_name = 'cash_accounts' and column_name in (
      'branch_id', 'responsible_person', 'responsible_person_mobile',
      'email', 'address', 'responsible_person_branch',
      'opening_balance', 'opening_balance_date'
    ))
  )
order by table_name, ordinal_position;

-- 4) Recreate the cash sync function with explicit, equal-length column/value lists.
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
  v_name text := trim(coalesce(new.responsible_person, 'Cash account')) ||
    ' (Cash / ' ||
    coalesce((select branch_name from public.branches where id = new.branch_id), 'Branch') || ')';
begin
  insert into public.ledger_accounts (
    branch_id,
    account_name,
    account_type,
    description,
    ledger_type,
    account_kind,
    source_cash_account_id,
    opening_balance,
    opening_balance_date,
    opening_balance_side,
    is_system,
    is_active
  ) values (
    new.branch_id,
    v_name,
    'asset',
    v_name,
    'cash',
    'cash',
    new.id,
    v_amount,
    new.opening_balance_date,
    'dr',
    true,
    true
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
      entry_date,
      branch_id,
      description,
      reference,
      source_module,
      status,
      approved_at
    ) values (
      new.opening_balance_date,
      new.branch_id,
      'Opening balance - ' || v_name,
      'account_opening:cash:' || new.id::text,
      'auto',
      'approved',
      now()
    ) returning id into v_entry_id;

    insert into public.journal_lines (
      journal_entry_id,
      line_no,
      branch_id,
      ledger_account_id,
      account_kind,
      cash_account_id,
      line_description,
      debit,
      credit
    ) values (
      v_entry_id,
      1,
      new.branch_id,
      v_ledger_id,
      'cash',
      new.id,
      'Opening balance - ' || v_name,
      v_amount,
      0
    );

    insert into public.journal_lines (
      journal_entry_id,
      line_no,
      branch_id,
      account_kind,
      line_description,
      debit,
      credit
    ) values (
      v_entry_id,
      2,
      new.branch_id,
      'ledger',
      'Opening balance offset',
      0,
      v_amount
    );
  end if;

  return new;
end;
$$;

-- 5) Ensure the cash trigger uses the repaired function.
drop trigger if exists cash_accounts_sync_ledger on public.cash_accounts;
create trigger cash_accounts_sync_ledger
after insert or update of branch_id, responsible_person, opening_balance, opening_balance_date
on public.cash_accounts
for each row execute function public.sync_cash_account_ledger();

-- 6) Verify the relevant triggers and functions are present.
select trigger_name, event_object_table, action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('bank_accounts', 'cash_accounts')
order by event_object_table, trigger_name;

select p.oid::regprocedure as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('sync_bank_account_ledger', 'sync_cash_account_ledger')
order by p.proname;

commit;

-- 7) Make the repaired columns/functions visible to Supabase REST immediately.
notify pgrst, 'reload schema';

-- 8) Optional post-repair smoke tests. These do not insert data.
select
  'bank_accounts' as table_name,
  count(*) filter (where opening_balance is not null) as rows_with_opening_balance
from public.bank_accounts
union all
select
  'cash_accounts',
  count(*) filter (where opening_balance is not null)
from public.cash_accounts;
