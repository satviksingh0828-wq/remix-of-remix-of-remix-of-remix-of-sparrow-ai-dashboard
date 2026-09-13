-- Accounts ledger categories
-- Manual ledgers use proper accounting categories: asset, liability, income,
-- and expenditure. Bank and cash remain system subtypes of asset. Capital is
-- retained only for the existing branch-capital system ledger.

begin;

-- Remove the old four-value check without depending on its generated name.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.ledger_accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%ledger_type%'
      and conname <> 'ledger_accounts_revenue_no_opening'
  loop
    execute format('alter table public.ledger_accounts drop constraint if exists %I', c.conname);
  end loop;
end;
$$;

update public.ledger_accounts
set ledger_type = 'income', account_type = 'income'
where ledger_type = 'revenue';

update public.ledger_accounts
set account_type = case
  when ledger_type in ('bank', 'cash', 'asset') then 'asset'
  when ledger_type = 'capital' then 'equity'
  when ledger_type = 'income' then 'income'
  when ledger_type = 'expenditure' then 'expenditure'
  when ledger_type = 'liability' then 'liability'
  else account_type
end
where ledger_type is not null;

alter table public.ledger_accounts
  add constraint ledger_accounts_ledger_type_check
  check (ledger_type in ('asset', 'liability', 'income', 'expenditure', 'bank', 'cash', 'capital'));

-- Revenue is now named income; income and expenditure ledgers cannot carry
-- opening balances because opening balances belong to balance-sheet accounts.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ledger_accounts_income_no_opening') then
    alter table public.ledger_accounts add constraint ledger_accounts_income_no_opening
      check (ledger_type not in ('income', 'expenditure') or (opening_balance = 0 and opening_balance_date is null));
  end if;
end;
$$;

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
  v_id uuid;
  v_name text := nullif(trim(p_description), '');
  v_type text := lower(trim(coalesce(p_ledger_type, '')));
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if v_type not in ('asset', 'liability', 'income', 'expenditure') then
    raise exception 'Ledger type must be asset, liability, income, or expenditure';
  end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  if coalesce(p_opening_balance, 0) <> 0 or p_opening_balance_date is not null then
    raise exception 'Opening balances are maintained through balance-sheet opening workflows';
  end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, opening_balance, opening_balance_date, opening_balance_side,
    is_system, is_active
  ) values (
    p_branch_id, v_name, v_type, v_name, v_type, 'ledger', 0, null, 'cr', false, true
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_manual_ledger(uuid, text, text, numeric, date, text)
to anon, authenticated;

create or replace function public.create_revenue_ledger(
  p_branch_id uuid,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(trim(p_description), '');
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, opening_balance, opening_balance_date, opening_balance_side,
    is_system, is_active
  ) values (
    p_branch_id, v_name, 'income', v_name, 'income', 'ledger', 0, null, 'cr', false, true
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_revenue_ledger(uuid, text) to anon, authenticated;

commit;

-- Verification queries:
-- select ledger_type, account_type, count(*) from public.ledger_accounts group by 1,2 order by 1,2;
-- select je.voucher_number, round(sum(jl.debit),2) debit, round(sum(jl.credit),2) credit
-- from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id = je.id
-- group by je.id, je.voucher_number having round(sum(jl.debit),2) <> round(sum(jl.credit),2);

-- Keep HRMS salary automation compatible after revenue is renamed to income.
create or replace function public.hrms_queue_event(
  p_event_type text,
  p_source_id uuid,
  p_branch_id uuid,
  p_event_date date,
  p_amount numeric,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_enabled boolean;
  v_requires boolean;
  v_debit uuid;
  v_credit uuid;
begin
  if p_branch_id is null or coalesce(p_amount, 0) <= 0 then return null; end if;
  select enabled, requires_verification, debit_ledger_id, default_bank_cash_ledger_id
    into v_enabled, v_requires, v_debit, v_credit
    from public.hrms_accounting_rules
   where branch_id = p_branch_id and rule_key = p_event_type;
  if not coalesce(v_enabled, false) or v_debit is null or v_credit is null then return null; end if;
  if not exists (select 1 from public.ledger_accounts where id = v_debit and branch_id = p_branch_id and is_active) then
    raise exception 'HRMS rule requires an active debit ledger from the employee branch';
  end if;
  if p_event_type = 'payroll_paid' and not exists (select 1 from public.ledger_accounts where id = v_debit and ledger_type = 'income') then
    raise exception 'Salary paid must debit an income ledger';
  end if;
  if p_event_type in ('loan_given', 'advance_given') and not exists (select 1 from public.ledger_accounts where id = v_debit and ledger_type = 'asset') then
    raise exception 'Loan and advance rules must debit an asset ledger';
  end if;
  if not exists (select 1 from public.ledger_accounts where id = v_credit and branch_id = p_branch_id and ledger_type in ('bank','cash') and is_active) then
    raise exception 'HRMS rule requires an active bank or cash credit account from the employee branch';
  end if;
  insert into public.hrms_accounting_queue(event_type, source_id, branch_id, event_date, amount, description)
  values (p_event_type, p_source_id, p_branch_id, coalesce(p_event_date, current_date), round(p_amount, 2), p_description)
  on conflict (event_type, source_id) do update set
    branch_id = excluded.branch_id, event_date = excluded.event_date, amount = excluded.amount,
    description = excluded.description, status = case when hrms_accounting_queue.status = 'posted' then 'posted' else 'pending' end
  returning id into v_id;
  if not coalesce(v_requires, true) then
    perform public.post_hrms_accounting_queue_item(v_id);
  end if;
  return v_id;
end;
$$;

grant execute on function public.hrms_queue_event(text, uuid, uuid, date, numeric, text)
to anon, authenticated;
