-- Allow HRMS Loan and Advance rules to debit ledger_type = 'capital'.
-- Run this script in the Supabase SQL Editor.

begin;

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

  if not coalesce(v_enabled, false) or v_debit is null or v_credit is null then
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
    p_event_type, p_source_id, p_branch_id, coalesce(p_event_date, current_date),
    round(p_amount, 2), p_description
  )
  on conflict (event_type, source_id) do update set
    branch_id = excluded.branch_id,
    event_date = excluded.event_date,
    amount = excluded.amount,
    description = excluded.description,
    status = case
      when hrms_accounting_queue.status = 'posted' then 'posted'
      else 'pending'
    end
  returning id into v_id;

  if not coalesce(v_requires, true) then
    perform public.post_hrms_accounting_queue_item(v_id);
  end if;
  return v_id;
end;
$$;

grant execute on function public.hrms_queue_event(text, uuid, uuid, date, numeric, text)
to anon, authenticated;

-- Verify the rule choices currently stored for Loan/Advance.
select
  r.rule_key,
  r.branch_id,
  r.debit_ledger_id,
  l.account_name,
  l.ledger_type,
  l.is_active
from public.hrms_accounting_rules r
left join public.ledger_accounts l on l.id = r.debit_ledger_id
where r.rule_key in ('loan_given', 'advance_given')
order by r.branch_id, r.rule_key;

commit;
notify pgrst, 'reload schema';
