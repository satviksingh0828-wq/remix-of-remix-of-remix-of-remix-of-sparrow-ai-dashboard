alter table public.report_templates
  add column if not exists period_mode text not null default 'month',
  add column if not exists date_basis text not null default 'automatic',
  add column if not exists group_by_branch boolean not null default false;

alter table public.report_templates
  drop constraint if exists report_templates_period_mode_check,
  drop constraint if exists report_templates_date_basis_check;

alter table public.report_templates
  add constraint report_templates_period_mode_check
    check (period_mode in ('month', 'year', 'financial_year', 'all', 'custom')),
  add constraint report_templates_date_basis_check
    check (date_basis in ('automatic', 'trip_start', 'trip_end', 'trip_closed', 'manifest_date', 'entry_date', 'received_date', 'paid_date'));

create index if not exists report_templates_period_scope_idx
  on public.report_templates (period_mode, report_scope, is_active);
