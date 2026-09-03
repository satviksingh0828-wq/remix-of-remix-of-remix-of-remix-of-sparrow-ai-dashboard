create table if not exists public.report_variables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variable_key text not null,
  system_value_key text not null,
  description text not null default '',
  data_type text not null check (data_type in ('text','number','currency','date','datetime','percentage')),
  default_aggregation text not null default 'none' check (default_aggregation in ('none','sum','avg','min','max','count','count_distinct')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists report_variables_name_ci on public.report_variables(lower(name));
create unique index if not exists report_variables_key_ci on public.report_variables(lower(variable_key));

create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  report_scope text not null check (report_scope in ('open_trip','closed_trip','all_trip','manifest','branch')),
  columns jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists report_templates_name_ci on public.report_templates(lower(name));

alter table public.report_variables enable row level security;
alter table public.report_templates enable row level security;
drop policy if exists "authenticated can read report variables" on public.report_variables;
create policy "authenticated can read report variables" on public.report_variables for select to anon, authenticated using (true);
drop policy if exists "authenticated can manage report variables" on public.report_variables;
create policy "authenticated can manage report variables" on public.report_variables for all to anon, authenticated using (true) with check (true);
drop policy if exists "authenticated can read report templates" on public.report_templates;
create policy "authenticated can read report templates" on public.report_templates for select to anon, authenticated using (true);
drop policy if exists "authenticated can manage report templates" on public.report_templates;
create policy "authenticated can manage report templates" on public.report_templates for all to anon, authenticated using (true) with check (true);
drop trigger if exists report_variables_updated_at on public.report_variables;
create trigger report_variables_updated_at before update on public.report_variables for each row execute function public.set_updated_at();
drop trigger if exists report_templates_updated_at on public.report_templates;
create trigger report_templates_updated_at before update on public.report_templates for each row execute function public.set_updated_at();
alter table public.report_templates
  drop constraint if exists report_templates_report_scope_check;

update public.report_templates
set report_scope = 'all_manifest'
where report_scope = 'manifest';

alter table public.report_templates
  add constraint report_templates_report_scope_check
  check (report_scope in (
    'open_trip', 'closed_trip', 'all_trip',
    'open_manifest', 'closed_manifest', 'all_manifest', 'branch'
  ));
alter table public.report_templates
  drop constraint if exists report_templates_report_scope_check;

alter table public.report_templates
  add constraint report_templates_report_scope_check
  check (report_scope in (
    'open_trip', 'closed_trip', 'all_trip',
    'open_manifest', 'closed_manifest', 'all_manifest',
    'branch', 'monthly', 'yearly'
  ));
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

-- Installation verification. All six values should be true.
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='period_mode') as has_period_mode,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='date_basis') as has_date_basis,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='group_by_branch') as has_group_by_branch,
  exists(select 1 from pg_constraint where conname='report_templates_period_mode_check') as has_period_mode_constraint,
  exists(select 1 from pg_constraint where conname='report_templates_date_basis_check') as has_date_basis_constraint,
  exists(select 1 from pg_indexes where schemaname='public' and tablename='report_templates' and indexname='report_templates_period_scope_idx') as has_period_scope_index;
