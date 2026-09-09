-- Rename the one-time payroll addition feature from Increment to Incentive.
-- This preserves all existing records and payroll snapshots.
do $$ begin
  if to_regclass('public.increment_amounts') is not null
     and to_regclass('public.incentive_amounts') is null then
    alter table public.increment_amounts rename to incentive_amounts;
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payrolls' and column_name = 'increment_amount'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payrolls' and column_name = 'incentive_amount'
  ) then
    alter table public.payrolls rename column increment_amount to incentive_amount;
  end if;
end $$;

alter table if exists public.incentive_amounts
  rename constraint increment_amounts_amount_check to incentive_amounts_amount_check;

comment on table public.incentive_amounts is 'One-time positive payroll incentives; pending rows are consumed once by payroll generation.';
comment on column public.payrolls.incentive_amount is 'One-time incentive total snapshotted into this payroll.';
