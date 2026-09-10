-- Optional employee email and automatic payroll email setting.

alter table public.employees
  add column if not exists email text;

alter table public.app_settings
  add column if not exists email_auto_send_payroll boolean not null default false;

comment on column public.employees.email is
  'Optional employee email address used for HR payroll delivery.';
comment on column public.app_settings.email_auto_send_payroll is
  'When enabled, email generated payroll payslips to the employee and CC Priyanshi.';
