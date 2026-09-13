-- Add an Effective From date to each HRMS accounting rule.
-- An HRMS event is accepted when its event date is on/after this date.
-- This intentionally allows past entries, as long as they are after the rule date.
-- Run this entire script in Supabase SQL Editor.

begin;

alter table public.hrms_accounting_rules
  add column if not exists effective_from date;

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
  v_effective_from date;
  v_event_date date := coalesce(p_event_date, current_date);
begin
  if p_branch_id is null or coalesce(p_amount, 0) <= 0 then return null; end if;

  select enabled, requires_verification, debit_ledger_id,
    default_bank_cash_ledger_id, effective_from
    into v_enabled, v_requires, v_debit, v_credit, v_effective_from
  from public.hrms_accounting_rules
  where branch_id = p_branch_id and rule_key = p_event_type;

  if not coalesce(v_enabled, false) or v_debit is null or v_credit is null then return null; end if;
  if v_effective_from is not null and v_event_date < v_effective_from then
    return null;
  end if;

  if not exists (
    select 1 from public.ledger_accounts
    where id = v_debit and branch_id = p_branch_id and is_active
  ) then
    raise exception 'HRMS rule requires an active debit ledger from the employee branch';
  end if;

  if p_event_type = 'payroll_paid' and not exists (
    select 1 from public.ledger_accounts
    where id = v_debit and branch_id = p_branch_id and ledger_type = 'revenue'
  ) then
    raise exception 'Salary paid must debit a revenue ledger';
  end if;

  if p_event_type in ('loan_given', 'advance_given') and not exists (
    select 1 from public.ledger_accounts
    where id = v_debit and branch_id = p_branch_id and ledger_type in ('asset', 'capital')
  ) then
    raise exception 'Loan and advance rules must debit an asset or capital ledger';
  end if;

  if not exists (
    select 1 from public.ledger_accounts
    where id = v_credit and branch_id = p_branch_id
      and ledger_type in ('bank', 'cash') and is_active
  ) then
    raise exception 'HRMS rule requires an active bank or cash credit account from the employee branch';
  end if;

  insert into public.hrms_accounting_queue(
    event_type, source_id, branch_id, event_date, amount, description
  ) values (
    p_event_type, p_source_id, p_branch_id, v_event_date, round(p_amount, 2), p_description
  )
  on conflict (event_type, source_id) do update set
    branch_id = excluded.branch_id,
    event_date = excluded.event_date,
    amount = excluded.amount,
    description = excluded.description,
    status = case when hrms_accounting_queue.status = 'posted' then 'posted' else 'pending' end
  returning id into v_id;

  if not coalesce(v_requires, true) then
    perform public.post_hrms_accounting_queue_item(v_id);
  end if;
  return v_id;
end;
$$;

create or replace function public.post_hrms_accounting_queue_item(p_queue_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.hrms_accounting_queue%rowtype;
  r public.hrms_accounting_rules%rowtype;
  v_entry uuid;
  v_existing uuid;
begin
  select * into q from public.hrms_accounting_queue where id = p_queue_id for update;
  if q.id is null then raise exception 'HRMS accounting queue item was not found'; end if;
  if q.status = 'posted' then return q.journal_entry_id; end if;

  select * into r
  from public.hrms_accounting_rules
  where branch_id = q.branch_id and rule_key = q.event_type;
  if not r.enabled or r.debit_ledger_id is null or r.default_bank_cash_ledger_id is null then
    raise exception 'HRMS accounting rule is incomplete or disabled';
  end if;
  if r.effective_from is not null and q.event_date < r.effective_from then
    return null;
  end if;

  select id into v_existing
  from public.journal_entries
  where reference = 'hrms:queue:' || q.id::text and source_module = 'hrms';
  if v_existing is not null then
    update public.hrms_accounting_queue
    set status = 'posted', journal_entry_id = v_existing, posted_at = coalesce(posted_at, now())
    where id = q.id;
    return v_existing;
  end if;

  insert into public.journal_entries(
    entry_date, branch_id, description, reference, source_module, status, approved_at
  ) values (
    q.event_date, q.branch_id, q.description, 'hrms:queue:' || q.id::text,
    'hrms', 'approved', now()
  ) returning id into v_entry;

  insert into public.journal_lines(
    journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
    line_description, debit, credit
  ) values
    (v_entry, 1, q.branch_id, r.debit_ledger_id, 'ledger', q.description, q.amount, 0),
    (v_entry, 2, q.branch_id, r.default_bank_cash_ledger_id,
      (select account_kind from public.ledger_accounts where id = r.default_bank_cash_ledger_id),
      q.description, 0, q.amount);

  update public.hrms_accounting_queue
  set status = 'posted', journal_entry_id = v_entry, posted_at = now()
  where id = q.id;
  return v_entry;
end;
$$;

grant execute on function public.hrms_queue_event(text, uuid, uuid, date, numeric, text)
to anon, authenticated;
grant execute on function public.post_hrms_accounting_queue_item(uuid)
to anon, authenticated;

select rule_key, branch_id, effective_from, enabled
from public.hrms_accounting_rules
order by branch_id, rule_key;

commit;
notify pgrst, 'reload schema';
