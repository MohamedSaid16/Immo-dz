-- =============================================================================
-- Immo DZ — Photo storage (Supabase Storage)
-- Run this in the Supabase SQL editor. Idempotent (safe to re-run).
-- Creates the public "property-photos" bucket + object policies.
-- =============================================================================

-- Public bucket for property photos.
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = true;

-- Anyone can read objects in the bucket (also served via public URLs).
drop policy if exists "property_photos_public_read" on storage.objects;
create policy "property_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'property-photos');

-- Authenticated users can upload / update / delete in the bucket.
-- (The /api/upload route additionally verifies property ownership.)
drop policy if exists "property_photos_auth_insert" on storage.objects;
create policy "property_photos_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'property-photos');

drop policy if exists "property_photos_auth_update" on storage.objects;
create policy "property_photos_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'property-photos');

drop policy if exists "property_photos_auth_delete" on storage.objects;
create policy "property_photos_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'property-photos');
