alter table public.report_templates
  drop constraint if exists report_templates_report_scope_check;

alter table public.report_templates
  add constraint report_templates_report_scope_check
  check (report_scope in (
    'open_trip', 'closed_trip', 'all_trip',
    'open_manifest', 'closed_manifest', 'all_manifest',
    'branch', 'monthly', 'yearly'
  ));
