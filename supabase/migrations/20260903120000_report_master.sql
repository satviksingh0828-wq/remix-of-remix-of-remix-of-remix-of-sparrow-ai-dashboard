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
create policy "authenticated can read report variables" on public.report_variables for select to anon, authenticated using (true);
create policy "authenticated can manage report variables" on public.report_variables for all to anon, authenticated using (true) with check (true);
create policy "authenticated can read report templates" on public.report_templates for select to anon, authenticated using (true);
create policy "authenticated can manage report templates" on public.report_templates for all to anon, authenticated using (true) with check (true);
create trigger report_variables_updated_at before update on public.report_variables for each row execute function public.set_updated_at();
create trigger report_templates_updated_at before update on public.report_templates for each row execute function public.set_updated_at();
