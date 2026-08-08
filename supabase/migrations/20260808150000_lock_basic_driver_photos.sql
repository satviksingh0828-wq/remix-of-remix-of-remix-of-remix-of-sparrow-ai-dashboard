-- Basic users may supply a missing driver photo once, but may never replace or
-- remove a path after it has been saved. Enforce this in PostgreSQL as well as
-- in the UI so direct API calls cannot bypass the rule.
create or replace function public.prevent_basic_driver_photo_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'basic'
  ) and (
    (nullif(trim(old.driver_photo_path), '') is not null and
      new.driver_photo_path is distinct from old.driver_photo_path) or
    (nullif(trim(old.aadhaar_photo_path), '') is not null and
      new.aadhaar_photo_path is distinct from old.aadhaar_photo_path) or
    (nullif(trim(old.licence_photo_path), '') is not null and
      new.licence_photo_path is distinct from old.licence_photo_path)
  ) then
    raise exception 'Basic users cannot replace or delete uploaded driver photos';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_basic_driver_photo_changes on public.drivers;
create trigger prevent_basic_driver_photo_changes
before update of driver_photo_path, aadhaar_photo_path, licence_photo_path
on public.drivers
for each row execute function public.prevent_basic_driver_photo_changes();

-- Keep Storage object replacement/deletion aligned with the database rule.
drop policy if exists "Authenticated users can update driver documents" on storage.objects;
create policy "Authenticated users can update driver documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-documents' and
  not exists (select 1 from public.app_users where id = auth.uid() and role = 'basic')
)
with check (
  bucket_id = 'driver-documents' and
  not exists (select 1 from public.app_users where id = auth.uid() and role = 'basic')
);

drop policy if exists "Authenticated users can delete driver documents" on storage.objects;
create policy "Authenticated users can delete driver documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-documents' and
  not exists (select 1 from public.app_users where id = auth.uid() and role = 'basic')
);
