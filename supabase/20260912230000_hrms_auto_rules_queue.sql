-- HRMS Auto Rules: employee accounting branches, queued events, and verified posting.
-- Run after 20260912180000_hrms_accounting_rules_verify.sql.
begin;

alter table public.ledger_accounts
  drop constraint if exists ledger_accounts_capital_system_only;

alter table public.hrms_accounting_rules
  add column if not exists debit_ledger_id uuid references public.ledger_accounts(id) on delete set null;

create table if not exists public.hrms_employee_accounting_branches (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hrms_employee_accounting_branch_idx
  on public.hrms_employee_accounting_branches(branch_id);

create table if not exists public.hrms_accounting_queue (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('payroll_paid','loan_given','advance_given')),
  source_id uuid not null,
  branch_id uuid not null references public.branches(id) on delete restrict,
  event_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  status text not null default 'pending' check (status in ('pending','posted','cancelled')),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (event_type, source_id)
);
create index if not exists hrms_accounting_queue_pending_idx
  on public.hrms_accounting_queue(status, event_date, branch_id);

alter table public.hrms_employee_accounting_branches enable row level security;
drop policy if exists hrms_employee_accounting_branches_access on public.hrms_employee_accounting_branches;
create policy hrms_employee_accounting_branches_access on public.hrms_employee_accounting_branches
for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.hrms_employee_accounting_branches to anon, authenticated;

alter table public.hrms_accounting_queue enable row level security;
drop policy if exists hrms_accounting_queue_access on public.hrms_accounting_queue;
create policy hrms_accounting_queue_access on public.hrms_accounting_queue
for all to anon, authenticated using (true) with check (true);
grant select, update on public.hrms_accounting_queue to anon, authenticated;

create or replace function public.hrms_branch_for_employee(p_employee_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select branch_id from public.hrms_employee_accounting_branches where employee_id = p_employee_id),
    (select d.branch_id from public.employees e join public.departments d on d.id = e.department_id where e.id = p_employee_id limit 1)
  )
$$;

create or replace function public.hrms_queue_event(
  p_event_type text,
  p_source_id uuid,
  p_branch_id uuid,
  p_event_date date,
  p_amount numeric,
  p_description text
)
returns uuid language plpgsql security definer set search_path = public as $$
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
  if p_event_type = 'payroll_paid' and not exists (select 1 from public.ledger_accounts where id = v_debit and ledger_type = 'revenue') then
    raise exception 'Salary paid must debit a revenue ledger';
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
end $$;

create or replace function public.post_hrms_accounting_queue_item(p_queue_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  q public.hrms_accounting_queue%rowtype;
  r public.hrms_accounting_rules%rowtype;
  v_entry uuid;
  v_existing uuid;
begin
  select * into q from public.hrms_accounting_queue where id = p_queue_id for update;
  if q.id is null then raise exception 'HRMS accounting queue item was not found'; end if;
  if q.status = 'posted' then return q.journal_entry_id; end if;
  select * into r from public.hrms_accounting_rules where branch_id = q.branch_id and rule_key = q.event_type;
  if not r.enabled or r.debit_ledger_id is null or r.default_bank_cash_ledger_id is null then raise exception 'HRMS accounting rule is incomplete or disabled'; end if;
  select id into v_existing from public.journal_entries where reference = 'hrms:queue:' || q.id::text and source_module = 'hrms';
  if v_existing is not null then
    update public.hrms_accounting_queue set status = 'posted', journal_entry_id = v_existing, posted_at = coalesce(posted_at, now()) where id = q.id;
    return v_existing;
  end if;
  insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status, approved_at)
  values (q.event_date, q.branch_id, q.description, 'hrms:queue:' || q.id::text, 'hrms', 'approved', now()) returning id into v_entry;
  insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, line_description, debit, credit)
  values
    (v_entry, 1, q.branch_id, r.debit_ledger_id, 'ledger', q.description, q.amount, 0),
    (v_entry, 2, q.branch_id, r.default_bank_cash_ledger_id, (select account_kind from public.ledger_accounts where id = r.default_bank_cash_ledger_id), q.description, 0, q.amount);
  update public.hrms_accounting_queue set status = 'posted', journal_entry_id = v_entry, posted_at = now() where id = q.id;
  return v_entry;
end $$;

create or replace function public.hrms_payroll_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_branch uuid; v_amount numeric;
begin
  if coalesce(new.payment_status, '') not in ('paid','partial_paid') then return new; end if;
  if tg_op = 'UPDATE' and new.payment_status = old.payment_status and coalesce(new.payment_date, '') = coalesce(old.payment_date, '') and coalesce(new.payment_amount, 0) = coalesce(old.payment_amount, 0) then return new; end if;
  v_branch := public.hrms_branch_for_employee(new.employee_id);
  v_amount := coalesce(nullif(new.payment_amount, 0), new.net);
  perform public.hrms_queue_event('payroll_paid', new.id, v_branch, coalesce(new.payment_date, new.period_end), v_amount, 'Salary paid - ' || coalesce(new.period_start, new.period_end));
  return new;
end $$;

create or replace function public.hrms_loan_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.hrms_queue_event('loan_given', new.id, public.hrms_branch_for_employee(new.employee_id), new.start_date, new.principal, 'Loan given');
  return new;
end $$;

create or replace function public.hrms_advance_accounting_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.hrms_queue_event('advance_given', new.id, public.hrms_branch_for_employee(new.employee_id), new.start_date, new.principal, 'Advance given');
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

create or replace function public.verify_hrms_accounting_queue(p_queue_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count integer := 0;
begin
  foreach v_id in array p_queue_ids loop
    perform public.post_hrms_accounting_queue_item(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

grant execute on function public.hrms_queue_event(text, uuid, uuid, date, numeric, text) to anon, authenticated;
grant execute on function public.post_hrms_accounting_queue_item(uuid) to anon, authenticated;
grant execute on function public.verify_hrms_accounting_queue(uuid[]) to anon, authenticated;

commit;
