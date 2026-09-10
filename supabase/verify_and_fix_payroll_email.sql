-- Employee email + automatic payroll email: verify and repair script
-- Run the entire script once in Supabase SQL Editor.
-- It is safe to run repeatedly.

begin;

alter table public.employees
  add column if not exists email text;

alter table public.app_settings
  add column if not exists email_auto_send_payroll boolean not null default false;

comment on column public.employees.email is
  'Optional employee email address used for HR payroll delivery.';
comment on column public.app_settings.email_auto_send_payroll is
  'When enabled, email generated payroll payslips to the employee and CC Priyanshi.';

commit;

-- Verification output: each query should return one row.
select
  'employees.email column' as check_name,
  column_name as result
from information_schema.columns
where table_schema = 'public'
  and table_name = 'employees'
  and column_name = 'email';

select
  'app_settings.email_auto_send_payroll column' as check_name,
  column_name as result
from information_schema.columns
where table_schema = 'public'
  and table_name = 'app_settings'
  and column_name = 'email_auto_send_payroll';

select
  'payroll email setting value' as check_name,
  coalesce(email_auto_send_payroll, false)::text as result
from public.app_settings
limit 1;

select
  'employees with email' as check_name,
  count(*)::text as result
from public.employees
where nullif(trim(email), '') is not null;
