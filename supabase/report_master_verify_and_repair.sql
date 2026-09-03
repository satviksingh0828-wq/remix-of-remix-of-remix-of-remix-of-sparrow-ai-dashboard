-- REPORT MASTER VERIFY + AUTO-REPAIR
-- Safe to run repeatedly in the Supabase SQL editor. This transaction creates or
-- repairs the Report Master-owned objects without deleting template or alias data.
begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.report_variables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variable_key text not null,
  system_value_key text not null,
  description text not null default '',
  data_type text not null default 'text',
  default_aggregation text not null default 'none',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_variables
  add column if not exists name text,
  add column if not exists variable_key text,
  add column if not exists system_value_key text,
  add column if not exists description text not null default '',
  add column if not exists data_type text not null default 'text',
  add column if not exists default_aggregation text not null default 'none',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  report_scope text not null default 'all_trip',
  period_mode text not null default 'month',
  date_basis text not null default 'automatic',
  group_by_branch boolean not null default false,
  columns jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_templates
  add column if not exists name text,
  add column if not exists description text not null default '',
  add column if not exists report_scope text not null default 'all_trip',
  add column if not exists period_mode text not null default 'month',
  add column if not exists date_basis text not null default 'automatic',
  add column if not exists group_by_branch boolean not null default false,
  add column if not exists columns jsonb not null default '[]'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Repair legacy/invalid values before restoring strict constraints.
update public.report_templates set report_scope = 'all_manifest' where report_scope = 'manifest';
update public.report_templates set report_scope = 'all_trip'
where report_scope is null or report_scope not in (
  'open_trip','closed_trip','all_trip','open_manifest','closed_manifest','all_manifest','branch','monthly','yearly'
);
update public.report_templates set period_mode = 'month'
where period_mode is null or period_mode not in ('month','year','financial_year','all','custom');
update public.report_templates set date_basis = 'automatic'
where date_basis is null or date_basis not in (
  'automatic','trip_start','trip_end','trip_closed','manifest_date','entry_date','received_date','paid_date'
);
update public.report_templates set columns = '[]'::jsonb where columns is null;
update public.report_templates set version = 1 where version is null or version < 1;
update public.report_variables set data_type = 'text'
where data_type is null or data_type not in ('text','number','currency','date','datetime','percentage');
update public.report_variables set default_aggregation = 'none'
where default_aggregation is null or default_aggregation not in ('none','sum','avg','min','max','count','count_distinct');
update public.report_variables set name = 'Recovered Variable ' || left(id::text, 8)
where name is null or btrim(name) = '';
update public.report_variables set variable_key = 'recovered_' || replace(id::text, '-', '')
where variable_key is null or btrim(variable_key) = '';
update public.report_variables set system_value_key = 'period.label'
where system_value_key is null or btrim(system_value_key) = '';
update public.report_templates set name = 'Recovered Template ' || left(id::text, 8)
where name is null or btrim(name) = '';

-- Preserve duplicates rather than deleting them: give later records deterministic,
-- editable names/keys so the case-insensitive unique indexes can be restored.
with duplicates as (
  select id, row_number() over (partition by lower(name) order by created_at, id) as occurrence
  from public.report_variables
)
update public.report_variables variable
set name = variable.name || ' (' || duplicates.occurrence || ')'
from duplicates where variable.id = duplicates.id and duplicates.occurrence > 1;
with duplicates as (
  select id, row_number() over (partition by lower(variable_key) order by created_at, id) as occurrence
  from public.report_variables
)
update public.report_variables variable
set variable_key = variable.variable_key || '_' || duplicates.occurrence
from duplicates where variable.id = duplicates.id and duplicates.occurrence > 1;
with duplicates as (
  select id, row_number() over (partition by lower(name) order by created_at, id) as occurrence
  from public.report_templates
)
update public.report_templates template
set name = template.name || ' (' || duplicates.occurrence || ')'
from duplicates where template.id = duplicates.id and duplicates.occurrence > 1;

alter table public.report_variables
  alter column name set not null,
  alter column variable_key set not null,
  alter column system_value_key set not null;
alter table public.report_templates alter column name set not null;

alter table public.report_variables
  drop constraint if exists report_variables_data_type_check,
  drop constraint if exists report_variables_default_aggregation_check;
alter table public.report_variables
  add constraint report_variables_data_type_check check (data_type in ('text','number','currency','date','datetime','percentage')),
  add constraint report_variables_default_aggregation_check check (default_aggregation in ('none','sum','avg','min','max','count','count_distinct'));

alter table public.report_templates
  drop constraint if exists report_templates_report_scope_check,
  drop constraint if exists report_templates_period_mode_check,
  drop constraint if exists report_templates_date_basis_check,
  drop constraint if exists report_templates_version_check;
alter table public.report_templates
  add constraint report_templates_report_scope_check check (report_scope in (
    'open_trip','closed_trip','all_trip','open_manifest','closed_manifest','all_manifest','branch','monthly','yearly'
  )),
  add constraint report_templates_period_mode_check check (period_mode in ('month','year','financial_year','all','custom')),
  add constraint report_templates_date_basis_check check (date_basis in (
    'automatic','trip_start','trip_end','trip_closed','manifest_date','entry_date','received_date','paid_date'
  )),
  add constraint report_templates_version_check check (version >= 1);

create unique index if not exists report_variables_name_ci on public.report_variables (lower(name));
create unique index if not exists report_variables_key_ci on public.report_variables (lower(variable_key));
create unique index if not exists report_templates_name_ci on public.report_templates (lower(name));
create index if not exists report_templates_period_scope_idx
  on public.report_templates (period_mode, report_scope, is_active);

alter table public.report_variables enable row level security;
alter table public.report_templates enable row level security;

drop policy if exists "authenticated can read report variables" on public.report_variables;
drop policy if exists "authenticated can manage report variables" on public.report_variables;
drop policy if exists "authenticated can read report templates" on public.report_templates;
drop policy if exists "authenticated can manage report templates" on public.report_templates;
create policy "authenticated can read report variables" on public.report_variables
  for select to anon, authenticated using (true);
create policy "authenticated can manage report variables" on public.report_variables
  for all to anon, authenticated using (true) with check (true);
create policy "authenticated can read report templates" on public.report_templates
  for select to anon, authenticated using (true);
create policy "authenticated can manage report templates" on public.report_templates
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists report_variables_updated_at on public.report_variables;
drop trigger if exists report_templates_updated_at on public.report_templates;
create trigger report_variables_updated_at before update on public.report_variables
  for each row execute function public.set_updated_at();
create trigger report_templates_updated_at before update on public.report_templates
  for each row execute function public.set_updated_at();

commit;

-- Verification: every report-owned object should be OK. Operational source tables
-- are verified but intentionally never fabricated because they contain business data.
with checks(item, ok, detail) as (
  values
    ('report_variables table', to_regclass('public.report_variables') is not null, 'Report aliases'),
    ('report_templates table', to_regclass('public.report_templates') is not null, 'Template definitions'),
    ('incomes source table', to_regclass('public.incomes') is not null, 'Required Operations Income source'),
    ('expenditures source table', to_regclass('public.expenditures') is not null, 'Required Operations Expenditure source'),
    ('trips source table', to_regclass('public.trips') is not null, 'Required open-trip source'),
    ('closed_trips source table', to_regclass('public.closed_trips') is not null, 'Required closed-trip source'),
    ('trip_manifests source table', to_regclass('public.trip_manifests') is not null, 'Required manifest source'),
    ('user_branch_access source table', to_regclass('public.user_branch_access') is not null, 'Required authorization source'),
    ('period_mode column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='period_mode'), 'month/year/financial year/all/custom'),
    ('date_basis column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='date_basis'), 'Date selection basis'),
    ('group_by_branch column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_templates' and column_name='group_by_branch'), 'Branch-wise output'),
    ('scope constraint', exists(select 1 from pg_constraint where conname='report_templates_report_scope_check' and conrelid='public.report_templates'::regclass), 'Allowed report scopes'),
    ('period constraint', exists(select 1 from pg_constraint where conname='report_templates_period_mode_check' and conrelid='public.report_templates'::regclass), 'Allowed period modes'),
    ('date basis constraint', exists(select 1 from pg_constraint where conname='report_templates_date_basis_check' and conrelid='public.report_templates'::regclass), 'Allowed date bases'),
    ('period/scope index', to_regclass('public.report_templates_period_scope_idx') is not null, 'Report lookup index'),
    ('template update trigger', exists(select 1 from pg_trigger where tgname='report_templates_updated_at' and not tgisinternal), 'Maintains updated_at'),
    ('variable update trigger', exists(select 1 from pg_trigger where tgname='report_variables_updated_at' and not tgisinternal), 'Maintains updated_at'),
    ('template RLS', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.report_templates')),false), 'Row-level security'),
    ('variable RLS', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.report_variables')),false), 'Row-level security')
)
select item, case when ok then 'OK' else 'MISSING: manual source-table installation required' end as status, detail
from checks
order by ok, item;
