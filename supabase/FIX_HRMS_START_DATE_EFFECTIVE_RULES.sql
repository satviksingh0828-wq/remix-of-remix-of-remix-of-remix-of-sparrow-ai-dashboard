-- Use the HRMS source Start date for Loan and Advance rule eligibility.
-- The system/queue entry timestamp must not be used.
-- Run this in Supabase SQL Editor after FIX_HRMS_RULE_EFFECTIVE_FROM.sql.

begin;

-- Repair existing queue rows so their event_date reflects the source Start date.
do $$
begin
  if to_regclass('public.loans') is not null then
    update public.hrms_accounting_queue q
    set event_date = l.start_date
    from public.loans l
    where q.event_type = 'loan_given'
      and q.source_id = l.id
      and l.start_date is not null
      and q.event_date is distinct from l.start_date;
  end if;

  if to_regclass('public.advances') is not null then
    update public.hrms_accounting_queue q
    set event_date = a.start_date
    from public.advances a
    where q.event_type = 'advance_given'
      and q.source_id = a.id
      and a.start_date is not null
      and q.event_date is distinct from a.start_date;
  end if;
end;
$$;

-- Recreate the triggers explicitly. Loans and Advances always pass Start date
-- as p_event_date; this is the date compared with effective_from.
create or replace function public.hrms_loan_accounting_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.hrms_queue_event(
    'loan_given',
    new.id,
    public.hrms_branch_for_employee(new.employee_id),
    new.start_date,
    new.principal,
    'Loan given'
  );
  return new;
end;
$$;

create or replace function public.hrms_advance_accounting_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.hrms_queue_event(
    'advance_given',
    new.id,
    public.hrms_branch_for_employee(new.employee_id),
    new.start_date,
    new.principal,
    'Advance given'
  );
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.loans') is not null then
    drop trigger if exists loans_hrms_accounting on public.loans;
    create trigger loans_hrms_accounting
      after insert on public.loans
      for each row execute function public.hrms_loan_accounting_trigger();
  end if;
  if to_regclass('public.advances') is not null then
    drop trigger if exists advances_hrms_accounting on public.advances;
    create trigger advances_hrms_accounting
      after insert on public.advances
      for each row execute function public.hrms_advance_accounting_trigger();
  end if;
end;
$$;

-- Verify the date used by every existing Loan/Advance queue item.
select
  q.event_type,
  q.source_id,
  q.event_date as queue_event_date,
  case
    when q.event_type = 'loan_given' then (select l.start_date from public.loans l where l.id = q.source_id)
    when q.event_type = 'advance_given' then (select a.start_date from public.advances a where a.id = q.source_id)
  end as source_start_date,
  r.effective_from,
  q.status
from public.hrms_accounting_queue q
left join public.hrms_accounting_rules r
  on r.branch_id = q.branch_id and r.rule_key = q.event_type
where q.event_type in ('loan_given', 'advance_given')
order by q.event_date desc;

commit;
notify pgrst, 'reload schema';
