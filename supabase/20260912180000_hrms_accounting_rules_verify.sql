-- HRMS cash-basis accounting rules and Journal > Verify workflow.
-- Run after the Accounts ledger/capital/transfer migrations.
begin;

-- Allow system expense and receivable ledgers used by cash-basis HRMS entries.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.ledger_accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%ledger_type%'
  loop
    execute format('alter table public.ledger_accounts drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.ledger_accounts
  add constraint ledger_accounts_ledger_type_check
  check (ledger_type in ('revenue', 'capital', 'bank', 'cash', 'expense', 'asset'));
alter table public.ledger_accounts
  add constraint ledger_accounts_capital_system_only
  check (ledger_type <> 'capital' or not is_active or is_default_capital or is_opening_offset or system_code like 'INTER_BRANCH:%');

alter table public.journal_entries add column if not exists verified_at timestamptz;
alter table public.journal_entries add column if not exists verified_by uuid;
alter table public.journal_entries add column if not exists verification_account_id uuid references public.ledger_accounts(id) on delete set null;
create index if not exists journal_entries_verification_idx on public.journal_entries(source_module, status, verified_at);

create table if not exists public.hrms_accounting_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  rule_key text not null check (rule_key in ('payroll_paid', 'loan_given', 'advance_given')),
  enabled boolean not null default true,
  requires_verification boolean not null default true,
  default_bank_cash_ledger_id uuid references public.ledger_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, rule_key)
);

insert into public.hrms_accounting_rules(branch_id, rule_key)
select b.id, r.rule_key
from public.branches b
cross join (values ('payroll_paid'), ('loan_given'), ('advance_given')) r(rule_key)
on conflict (branch_id, rule_key) do nothing;

create or replace function public.provision_hrms_accounting_rules_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.hrms_accounting_rules(branch_id, rule_key)
  select new.id, r.rule_key
  from (values ('payroll_paid'), ('loan_given'), ('advance_given')) r(rule_key)
  on conflict (branch_id, rule_key) do nothing;
  return new;
end $$;

drop trigger if exists branches_hrms_accounting_rules on public.branches;
create trigger branches_hrms_accounting_rules after insert on public.branches
for each row execute function public.provision_hrms_accounting_rules_trigger();

alter table public.hrms_accounting_rules enable row level security;
drop policy if exists "hrms accounting rules app access" on public.hrms_accounting_rules;
create policy "hrms accounting rules app access" on public.hrms_accounting_rules
for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.hrms_accounting_rules to anon, authenticated;
grant select, insert, update on public.journal_entries to anon, authenticated;
grant select, insert, update on public.journal_lines to anon, authenticated;

create or replace function public.hrms_branch_for_employee(p_employee_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select d.branch_id
  from public.employees e
  join public.departments d on d.id = e.department_id
  where e.id = p_employee_id
  limit 1
$$;

create or replace function public.hrms_system_ledger(
  p_branch_id uuid,
  p_system_code text,
  p_account_name text,
  p_ledger_type text,
  p_account_type text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, system_code, is_system, is_active
  ) values (
    p_branch_id, p_account_name, p_account_type, p_account_name,
    p_ledger_type, 'ledger', p_system_code, true, true
  )
  on conflict (branch_id, account_name) do update set
    system_code = excluded.system_code, account_type = excluded.account_type,
    ledger_type = excluded.ledger_type, is_system = true, is_active = true
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.hrms_post_auto_entry(
  p_rule_key text,
  p_source_id uuid,
  p_branch_id uuid,
  p_entry_date date,
  p_amount numeric,
  p_description text,
  p_reference text,
  p_debit_name text,
  p_debit_type text,
  p_debit_account_type text,
  p_credit_ledger_id uuid
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_entry_id uuid;
  v_debit_id uuid;
  v_requires boolean;
  v_enabled boolean;
  v_credit_id uuid := p_credit_ledger_id;
begin
  if p_branch_id is null or coalesce(p_amount, 0) <= 0 then return null; end if;
  select enabled, requires_verification, coalesce(default_bank_cash_ledger_id, p_credit_ledger_id)
    into v_enabled, v_requires, v_credit_id
  from public.hrms_accounting_rules
  where branch_id = p_branch_id and rule_key = p_rule_key;
  if not coalesce(v_enabled, false) or v_credit_id is null then return null; end if;
  if not exists (
    select 1 from public.ledger_accounts
    where id = v_credit_id and branch_id = p_branch_id
      and ledger_type in ('bank', 'cash') and is_active
  ) then raise exception 'HRMS accounting rule requires an active bank or cash ledger'; end if;
  v_debit_id := public.hrms_system_ledger(
    p_branch_id, 'HRMS:' || upper(p_rule_key), p_debit_name,
    p_debit_type, p_debit_account_type
  );
  delete from public.journal_entries where reference = p_reference and source_module = 'hrms';
  insert into public.journal_entries(
    entry_date, branch_id, description, reference, source_module, status
  ) values (
    p_entry_date, p_branch_id, p_description, p_reference, 'hrms',
    case when coalesce(v_requires, true) then 'pending' else 'approved' end
  ) returning id into v_entry_id;
  insert into public.journal_lines(
    journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
    line_description, debit, credit
  ) values
    (v_entry_id, 1, p_branch_id, v_debit_id, 'ledger', p_description, round(p_amount, 2), 0),
    (v_entry_id, 2, p_branch_id, v_credit_id,
     (select account_kind from public.ledger_accounts where id = v_credit_id),
     p_description, 0, round(p_amount, 2));
  perform public.validate_journal_entry(v_entry_id);
  return v_entry_id;
end $$;

create or replace function public.hrms_payroll_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_branch_id uuid; v_amount numeric; v_key text; v_bank uuid;
begin
  if coalesce(new.payment_status, '') not in ('paid', 'partial_paid') then return new; end if;
  if tg_op = 'UPDATE' and new.payment_status = old.payment_status
     and coalesce(new.payment_date, '') = coalesce(old.payment_date, '')
     and coalesce(new.payment_amount, 0) = coalesce(old.payment_amount, 0) then return new; end if;
  v_branch_id := public.hrms_branch_for_employee(new.employee_id);
  select default_bank_cash_ledger_id into v_bank
  from public.hrms_accounting_rules
  where branch_id = v_branch_id and rule_key = 'payroll_paid';
  v_amount := coalesce(nullif(new.payment_amount, 0), new.net);
  v_key := 'hrms:payroll:' || new.id::text || ':' || coalesce(new.payment_date, new.period_end);
  perform public.hrms_post_auto_entry(
    'payroll_paid', new.id, v_branch_id, coalesce(new.payment_date, new.period_end), v_amount,
    'Payroll paid - ' || coalesce(new.period_start, new.period_end), v_key,
    'Payroll Expense - ' || coalesce((select branch_name from public.branches where id = v_branch_id), 'Branch'),
    'expense', 'expense',
    v_bank
  );
  return new;
end $$;

create or replace function public.hrms_loan_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_branch_id uuid; v_bank uuid;
begin
  v_branch_id := public.hrms_branch_for_employee(new.employee_id);
  select default_bank_cash_ledger_id into v_bank from public.hrms_accounting_rules where branch_id = v_branch_id and rule_key = 'loan_given';
  perform public.hrms_post_auto_entry('loan_given', new.id, v_branch_id, new.start_date, new.principal,
    'Loan given', 'hrms:loan:' || new.id::text, 'Employee Loan Receivable - ' || coalesce((select branch_name from public.branches where id = v_branch_id), 'Branch'), 'asset', 'asset', v_bank);
  return new;
end $$;

create or replace function public.hrms_advance_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_branch_id uuid; v_bank uuid;
begin
  v_branch_id := public.hrms_branch_for_employee(new.employee_id);
  select default_bank_cash_ledger_id into v_bank from public.hrms_accounting_rules where branch_id = v_branch_id and rule_key = 'advance_given';
  perform public.hrms_post_auto_entry('advance_given', new.id, v_branch_id, new.start_date, new.principal,
    'Advance given', 'hrms:advance:' || new.id::text, 'Employee Advance Receivable - ' || coalesce((select branch_name from public.branches where id = v_branch_id), 'Branch'), 'asset', 'asset', v_bank);
  return new;
end $$;

do $$
begin
  if to_regclass('public.payrolls') is not null then
    drop trigger if exists payrolls_hrms_accounting on public.payrolls;
    create trigger payrolls_hrms_accounting after insert or update of payment_status, payment_date, payment_amount on public.payrolls for each row execute function public.hrms_payroll_accounting_trigger();
  end if;
  if to_regclass('public.loans') is not null then
    drop trigger if exists loans_hrms_accounting on public.loans;
    create trigger loans_hrms_accounting after insert on public.loans for each row execute function public.hrms_loan_accounting_trigger();
  end if;
  if to_regclass('public.advances') is not null then
    drop trigger if exists advances_hrms_accounting on public.advances;
    create trigger advances_hrms_accounting after insert on public.advances for each row execute function public.hrms_advance_accounting_trigger();
  end if;
end $$;

create or replace function public.verify_hrms_journal_entries(
  p_entry_ids uuid[],
  p_bank_cash_ledger_id uuid default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count integer := 0; v_branch uuid;
begin
  foreach v_id in array p_entry_ids loop
    select branch_id into v_branch from public.journal_entries
    where id = v_id and source_module = 'hrms' and status = 'pending' for update;
    if v_branch is null then continue; end if;
    if p_bank_cash_ledger_id is not null then
      if not exists (select 1 from public.ledger_accounts where id = p_bank_cash_ledger_id and branch_id = v_branch and ledger_type in ('bank','cash') and is_active) then
        raise exception 'Verification account must be an active bank/cash ledger from the entry branch';
      end if;
      update public.journal_lines set ledger_account_id = p_bank_cash_ledger_id,
        account_kind = (select account_kind from public.ledger_accounts where id = p_bank_cash_ledger_id)
      where journal_entry_id = v_id and credit > 0;
    end if;
    update public.journal_entries set status = 'approved', verified_at = now(), verification_account_id = p_bank_cash_ledger_id
    where id = v_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

grant execute on function public.verify_hrms_journal_entries(uuid[], uuid) to anon, authenticated;
grant execute on function public.hrms_post_auto_entry(text, uuid, uuid, date, numeric, text, text, text, text, text, uuid) to anon, authenticated;
commit;

-- Verification queries.
select rule_key, count(*) from public.hrms_accounting_rules group by rule_key order by rule_key;
select status, source_module, count(*) from public.journal_entries group by status, source_module order by source_module, status;
