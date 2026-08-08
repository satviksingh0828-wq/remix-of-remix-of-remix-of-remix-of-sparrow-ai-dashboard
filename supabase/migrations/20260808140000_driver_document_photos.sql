-- Compulsory driver photo metadata and private document storage.
alter table public.drivers
  add column if not exists driver_photo_path text,
  add column if not exists aadhaar_photo_path text,
  add column if not exists licence_photo_path text;

alter table public.drivers drop constraint if exists drivers_compulsory_photos_check;
alter table public.drivers add constraint drivers_compulsory_photos_check check (
  nullif(trim(driver_photo_path), '') is not null and
  nullif(trim(aadhaar_photo_path), '') is not null and
  nullif(trim(licence_photo_path), '') is not null
) not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-documents', 'driver-documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read driver documents" on storage.objects;
create policy "Authenticated users can read driver documents"
on storage.objects for select to authenticated
using (bucket_id = 'driver-documents');

drop policy if exists "Authenticated users can upload driver documents" on storage.objects;
create policy "Authenticated users can upload driver documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'driver-documents');

drop policy if exists "Authenticated users can update driver documents" on storage.objects;
create policy "Authenticated users can update driver documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-documents' and
  not exists (select 1 from public.app_users where id = auth.uid() and role = 'basic')
) with check (
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

comment on column public.drivers.driver_photo_path is 'Private driver-documents bucket object path';
comment on column public.drivers.aadhaar_photo_path is 'Private driver-documents bucket object path';
comment on column public.drivers.licence_photo_path is 'Private driver-documents bucket object path';
