-- ============================================================================
-- Migration 0006: Storage bucket + storage RLS policies
-- Moroccan Caftan Rental — Phase 1
--
-- Bucket "caftan-images": publicly readable (catalog images), writable only
-- by admins. Binary uploads happen in the admin phase via the Supabase
-- Storage API, which enforces these policies on storage.objects.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('caftan-images', 'caftan-images', true)
on conflict (id) do nothing;

drop policy if exists caftan_images_storage_public_read on storage.objects;
create policy caftan_images_storage_public_read on storage.objects
  for select using (bucket_id = 'caftan-images');

drop policy if exists caftan_images_storage_admin_insert on storage.objects;
create policy caftan_images_storage_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'caftan-images' and public.is_admin());

drop policy if exists caftan_images_storage_admin_update on storage.objects;
create policy caftan_images_storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'caftan-images' and public.is_admin())
  with check (bucket_id = 'caftan-images' and public.is_admin());

drop policy if exists caftan_images_storage_admin_delete on storage.objects;
create policy caftan_images_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'caftan-images' and public.is_admin());
