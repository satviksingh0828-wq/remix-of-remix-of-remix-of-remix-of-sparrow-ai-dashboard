-- DANGER: DESTRUCTIVE RESET OF ALL ACCOUNTS DATA
-- Deletes all Accounts bank/cash masters, ledgers, journal entries, and journal
-- lines. It preserves branches, users, employees, and operational transactions.
-- Review and back up the database before running in Supabase SQL Editor.
-- The reset is disabled by default: change the confirmation flag to TRUE.

begin;

do $$
declare
  reset_confirmed boolean := false;
begin
  if not reset_confirmed then
    raise exception 'Accounts reset is disabled. Set reset_confirmed := true after taking a backup.';
  end if;
end;
$$;

-- Remove references held by HRMS accounting configuration before deleting ledgers.
do $$
begin
  if to_regclass('public.hrms_accounting_rules') is not null then
    update public.hrms_accounting_rules
    set default_bank_cash_ledger_id = null,
        debit_ledger_id = null;
  end if;
end;
$$;

-- Delete journal parents; journal_lines are removed by ON DELETE CASCADE.
delete from public.journal_entries;

-- Remove every ledger, including automatic bank/cash and branch capital ledgers.
delete from public.ledger_accounts;

-- Remove the Accounts master records. This leaves the Accounts module empty.
delete from public.bank_accounts;
delete from public.cash_accounts;

commit;

-- Post-reset verification: every result should be zero.
select
  (select count(*) from public.bank_accounts) as bank_accounts_remaining,
  (select count(*) from public.cash_accounts) as cash_accounts_remaining,
  (select count(*) from public.ledger_accounts) as ledger_accounts_remaining,
  (select count(*) from public.journal_entries) as journal_entries_remaining,
  (select count(*) from public.journal_lines) as journal_lines_remaining;
