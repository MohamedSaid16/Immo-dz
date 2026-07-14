-- =============================================================================
-- Immo DZ - Phase 0A / 004: Storage bucket and baseline policies
--
-- Safe to run more than once. Existing policies are not recreated. Phase 0C
-- will restrict writes to property folders owned by the authenticated agency.
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    name = EXCLUDED.name
WHERE storage.buckets.public IS DISTINCT FROM EXCLUDED.public
   OR storage.buckets.name IS DISTINCT FROM EXCLUDED.name;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'property_photos_public_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_photos_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'property-photos')
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'property_photos_auth_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_photos_auth_insert
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'property-photos')
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'property_photos_auth_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_photos_auth_update
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'property-photos')
      WITH CHECK (bucket_id = 'property-photos')
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'property_photos_auth_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_photos_auth_delete
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'property-photos')
    $policy$;
  END IF;
END
$migration$;

NOTIFY pgrst, 'reload schema';

COMMIT;
