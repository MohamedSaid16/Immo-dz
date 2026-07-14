-- =============================================================================
-- Immo DZ - Phase 0C / 005: security constraints and authorization helpers
--
-- Additive and idempotent. New constraints are NOT VALID so existing rows are
-- preserved while all future inserts and updates are checked immediately.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Small immutable helpers used by constraints.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.text_array_has_unique_values(input_values text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT COALESCE(
    cardinality(input_values) = (
      SELECT count(DISTINCT item)
      FROM unnest(input_values) AS item
    ),
    true
  )
$function$;

REVOKE ALL ON FUNCTION public.text_array_has_unique_values(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.text_array_has_unique_values(text[]) TO authenticated;

-- -----------------------------------------------------------------------------
-- Length, range, and shape constraints. NOT VALID deliberately retains legacy
-- rows while still enforcing the checks for every new or changed row.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.agencies'::regclass AND conname = 'agencies_security_fields_check') THEN
    ALTER TABLE public.agencies ADD CONSTRAINT agencies_security_fields_check CHECK (
      char_length(btrim(name)) BETWEEN 1 AND 120
      AND (wilaya IS NULL OR char_length(btrim(wilaya)) BETWEEN 1 AND 100)
      AND (address IS NULL OR char_length(address) <= 300)
      AND (phone IS NULL OR char_length(phone) <= 32)
      AND (about IS NULL OR char_length(about) <= 5000)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_security_fields_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_security_fields_check CHECK (
      (email IS NULL OR char_length(email) <= 254)
      AND (full_name IS NULL OR char_length(full_name) <= 100)
      AND (phone IS NULL OR char_length(phone) <= 32)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_security_text_check') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_security_text_check CHECK (
      char_length(btrim(title)) BETWEEN 5 AND 200
      AND (wilaya IS NULL OR char_length(wilaya) <= 100)
      AND (municipality IS NULL OR char_length(municipality) <= 120)
      AND (address IS NULL OR char_length(address) <= 300)
      AND (description IS NULL OR char_length(description) <= 10000)
      AND (slug IS NULL OR char_length(slug) <= 240)
      AND (title_fr IS NULL OR char_length(title_fr) <= 200)
      AND (description_fr IS NULL OR char_length(description_fr) <= 10000)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_security_numeric_check') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_security_numeric_check CHECK (
      price > 0 AND price <= 1000000000000000
      AND area >= 0 AND area <= 100000000
      AND rooms BETWEEN 0 AND 100
      AND floor BETWEEN 0 AND 300
      AND bathrooms BETWEEN 0 AND 100
      AND parking_spots BETWEEN 0 AND 1000
      AND views_count >= 0
      AND contacts_count >= 0
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_coordinates_check') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_coordinates_check CHECK (
      (latitude IS NULL) = (longitude IS NULL)
      AND (latitude IS NULL OR latitude BETWEEN -90 AND 90)
      AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_media_urls_check') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_media_urls_check CHECK (
      (virtual_tour_url IS NULL OR (char_length(virtual_tour_url) <= 2048 AND virtual_tour_url ~* '^https?://'))
      AND (video_url IS NULL OR (char_length(video_url) <= 2048 AND video_url ~* '^https?://'))
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_arrays_check') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_arrays_check CHECK (
      cardinality(amenities) <= 64
      AND cardinality(nearby_places) <= 64
      AND cardinality(features) <= 64
      AND array_position(amenities, NULL) IS NULL
      AND array_position(nearby_places, NULL) IS NULL
      AND array_position(features, NULL) IS NULL
      AND public.text_array_has_unique_values(amenities)
      AND public.text_array_has_unique_values(nearby_places)
      AND public.text_array_has_unique_values(features)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.property_images'::regclass AND conname = 'property_images_security_fields_check') THEN
    ALTER TABLE public.property_images ADD CONSTRAINT property_images_security_fields_check CHECK (
      char_length(url) <= 2048
      AND url ~* ('/storage/v1/object/public/property-photos/' || property_id::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
      AND (thumbnail_url IS NULL OR char_length(thumbnail_url) <= 2048)
      AND "order" BETWEEN 0 AND 1000000
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.leads'::regclass AND conname = 'leads_security_fields_check') THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_security_fields_check CHECK (
      char_length(btrim(name)) BETWEEN 2 AND 100
      AND char_length(regexp_replace(phone, '[^0-9]', '', 'g')) BETWEEN 9 AND 15
      AND char_length(phone) <= 32
      AND (email IS NULL OR (char_length(email) <= 254 AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
      AND (message IS NULL OR char_length(message) <= 2000)
      AND (notes IS NULL OR char_length(notes) <= 5000)
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.interactions'::regclass AND conname = 'interactions_metadata_check') THEN
    ALTER TABLE public.interactions ADD CONSTRAINT interactions_metadata_check CHECK (
      jsonb_typeof(metadata) = 'object'
      AND octet_length(metadata::text) <= 4096
    ) NOT VALID;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Security-definer authorization helpers. The caller never supplies a user id;
-- ownership is always derived from the verified Supabase auth context.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_owns_agency(target_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.agencies AS agency
    WHERE agency.id = target_agency_id
      AND agency.owner_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.current_user_owns_property(target_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.properties AS property
    JOIN public.agencies AS agency ON agency.id = property.agency_id
    WHERE property.id = target_property_id
      AND agency.owner_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_public_property_for_agency(
  target_property_id uuid,
  target_agency_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = target_property_id
      AND property.agency_id = target_agency_id
      AND property.is_published = true
      AND property.archived_at IS NULL
  )
$function$;

REVOKE ALL ON FUNCTION public.current_user_owns_agency(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_owns_property(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_public_property_for_agency(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owns_agency(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_owns_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_property_for_agency(uuid, uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Harden the registration bootstrap RPC without changing its public signature.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_agency_for_current_user(
  agency_name text,
  agency_wilaya text,
  contact_phone text,
  contact_full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text;
  current_agency_id uuid;
  normalized_agency_name text := NULLIF(btrim(agency_name), '');
  normalized_wilaya text := NULLIF(btrim(agency_wilaya), '');
  normalized_phone text := NULLIF(btrim(contact_phone), '');
  normalized_full_name text := NULLIF(btrim(contact_full_name), '');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  SELECT profile.agency_id
  INTO current_agency_id
  FROM public.profiles AS profile
  WHERE profile.id = current_user_id;

  IF current_agency_id IS NOT NULL THEN
    IF NOT public.current_user_owns_agency(current_agency_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The linked agency is not owned by the current user.';
    END IF;
    RETURN current_agency_id;
  END IF;

  SELECT agency.id
  INTO current_agency_id
  FROM public.agencies AS agency
  WHERE agency.owner_id = current_user_id
  ORDER BY agency.created_at ASC, agency.id ASC
  LIMIT 1;

  IF current_agency_id IS NULL THEN
    IF normalized_agency_name IS NULL OR char_length(normalized_agency_name) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency name is invalid.';
    END IF;
    IF normalized_wilaya IS NULL OR char_length(normalized_wilaya) > 100 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Wilaya is invalid.';
    END IF;
    IF normalized_phone IS NOT NULL AND (
      char_length(normalized_phone) > 32
      OR char_length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) NOT BETWEEN 9 AND 15
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Phone is invalid.';
    END IF;
    IF normalized_full_name IS NOT NULL AND char_length(normalized_full_name) > 100 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Full name is invalid.';
    END IF;

    INSERT INTO public.agencies (name, wilaya, phone, owner_id)
    VALUES (normalized_agency_name, normalized_wilaya, normalized_phone, current_user_id)
    RETURNING id INTO current_agency_id;
  END IF;

  SELECT auth_user.email
  INTO current_email
  FROM auth.users AS auth_user
  WHERE auth_user.id = current_user_id;

  INSERT INTO public.profiles (id, email, full_name, phone, agency_id)
  VALUES (
    current_user_id,
    current_email,
    normalized_full_name,
    normalized_phone,
    current_agency_id
  )
  ON CONFLICT (id) DO UPDATE
  SET agency_id = EXCLUDED.agency_id,
      email = COALESCE(public.profiles.email, EXCLUDED.email),
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone);

  RETURN current_agency_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_agency_for_current_user(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_agency_for_current_user(text, text, text, text) TO authenticated;

-- Trigger functions operate with table-owner privileges so least-privilege
-- column grants cannot prevent cover promotion or counter maintenance.
-- Replace the contact trigger body as well: older installations may already
-- have a legacy version that referenced an unqualified `properties` table.
CREATE OR REPLACE FUNCTION public.increment_contacts_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    UPDATE public.properties
    SET contacts_count = contacts_count + 1
    WHERE id = NEW.property_id;
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.prepare_property_image_insert() SECURITY DEFINER;
ALTER FUNCTION public.promote_property_image_cover() SECURITY DEFINER;
ALTER FUNCTION public.increment_contacts_on_lead() SECURITY DEFINER;
ALTER FUNCTION public.prepare_property_image_insert() SET search_path = '';
ALTER FUNCTION public.promote_property_image_cover() SET search_path = '';
ALTER FUNCTION public.increment_contacts_on_lead() SET search_path = '';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_property_image_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_property_image_cover() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_contacts_on_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
