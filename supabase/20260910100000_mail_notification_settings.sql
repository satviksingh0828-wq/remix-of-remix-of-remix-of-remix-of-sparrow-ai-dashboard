-- Mail notification settings for the Settings > Mail tab.
-- Safe to run repeatedly in Supabase SQL Editor.
begin;

alter table public.app_settings
  add column if not exists email_auto_send_payroll boolean not null default false,
  add column if not exists email_send_admin_notifications boolean not null default true,
  add column if not exists email_send_branch_open_trips boolean not null default true,
  add column if not exists email_send_expiry_notifications boolean not null default true,
  add column if not exists email_send_hr_notifications boolean not null default true,
  add column if not exists email_send_on_payment boolean not null default false,
  add column if not exists email_send_loan boolean not null default false,
  add column if not exists email_send_advance boolean not null default false,
  add column if not exists email_send_loss_deduction boolean not null default false,
  add column if not exists email_send_attendance_monthly boolean not null default false;

alter table public.employees
  add column if not exists email text;

comment on column public.app_settings.email_auto_send_payroll is 'Send a generated payslip by email to the employee.';
comment on column public.app_settings.email_send_admin_notifications is 'Send consolidated dashboard/admin notification emails.';
comment on column public.app_settings.email_send_branch_open_trips is 'Send the daily open-trip summary to each branch.';
comment on column public.app_settings.email_send_expiry_notifications is 'Send insurance and road-tax expiry emails.';
comment on column public.app_settings.email_send_hr_notifications is 'Send HR and Monthly MIS notification emails.';
comment on column public.employees.email is 'Employee email address used for HR payroll delivery.';

-- Ensure an existing singleton settings row has explicit values after upgrade.
update public.app_settings
set
  email_auto_send_payroll = coalesce(email_auto_send_payroll, false),
  email_send_admin_notifications = coalesce(email_send_admin_notifications, true),
  email_send_branch_open_trips = coalesce(email_send_branch_open_trips, true),
  email_send_expiry_notifications = coalesce(email_send_expiry_notifications, true),
  email_send_hr_notifications = coalesce(email_send_hr_notifications, true),
  email_send_on_payment = coalesce(email_send_on_payment, false),
  email_send_loan = coalesce(email_send_loan, false),
  email_send_advance = coalesce(email_send_advance, false),
  email_send_loss_deduction = coalesce(email_send_loss_deduction, false),
  email_send_attendance_monthly = coalesce(email_send_attendance_monthly, false);

commit;

-- Verification
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'app_settings'
  and column_name like 'email_%'
order by column_name;
