-- Semi-Admin role support for public.app_users
-- Run this manually in the Supabase SQL Editor if app_users.role has a CHECK constraint.
-- The application stores roles as text and does not require a schema change when no
-- role CHECK constraint exists.

begin;

-- Inspect existing role-related CHECK constraints before changing anything.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.app_users'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%role%';

-- Replace role-related CHECK constraints with the four supported application roles.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.app_users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format(
      'alter table public.app_users drop constraint %I',
      constraint_row.conname
    );
  end loop;
end
$$;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'semi_admin', 'basic', 'viewer'));

commit;

-- Optional example: assign the new role to an existing user.
-- update public.app_users
-- set role = 'semi_admin', updated_at = now()
-- where username = 'replace-with-username';
