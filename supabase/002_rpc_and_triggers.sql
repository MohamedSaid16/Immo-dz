-- =============================================================================
-- Immo DZ - Phase 0A / 002: RPCs and lifecycle triggers
--
-- Safe to run more than once. Functions and triggers are created only when an
-- equivalent signature/name is missing. This migration does not publish drafts.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger function
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
      AS $function$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.properties'::regclass
      AND tgname = 'properties_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER properties_set_updated_at
      BEFORE UPDATE ON public.properties
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.leads'::regclass
      AND tgname = 'leads_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER leads_set_updated_at
      BEFORE UPDATE ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Auth bootstrap. The auth trigger creates a profile only. Agency creation is
-- performed after an authenticated session exists by the RPC below.
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $function$
      BEGIN
        INSERT INTO public.profiles (id, email, full_name, phone)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data ->> 'full_name',
          NEW.raw_user_meta_data ->> 'phone'
        )
        ON CONFLICT (id) DO NOTHING;

        RETURN NEW;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

DO $migration$
BEGIN
  IF to_regprocedure(
    'public.ensure_agency_for_current_user(text,text,text,text)'
  ) IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.ensure_agency_for_current_user(
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
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Authentication is required.';
        END IF;

        -- Serialize repeated login/confirmation callbacks for the same user.
        PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

        SELECT profile.agency_id
        INTO current_agency_id
        FROM public.profiles AS profile
        WHERE profile.id = current_user_id;

        IF current_agency_id IS NOT NULL THEN
          RETURN current_agency_id;
        END IF;

        SELECT agency.id
        INTO current_agency_id
        FROM public.agencies AS agency
        WHERE agency.owner_id = current_user_id
        ORDER BY agency.created_at ASC, agency.id ASC
        LIMIT 1;

        IF current_agency_id IS NULL THEN
          IF normalized_agency_name IS NULL THEN
            RAISE EXCEPTION USING
              ERRCODE = '22023',
              MESSAGE = 'Agency name is required.';
          END IF;

          IF normalized_wilaya IS NULL THEN
            RAISE EXCEPTION USING
              ERRCODE = '22023',
              MESSAGE = 'Wilaya is required.';
          END IF;

          INSERT INTO public.agencies (name, wilaya, phone, owner_id)
          VALUES (
            normalized_agency_name,
            normalized_wilaya,
            normalized_phone,
            current_user_id
          )
          RETURNING id INTO current_agency_id;
        END IF;

        SELECT auth_user.email
        INTO current_email
        FROM auth.users AS auth_user
        WHERE auth_user.id = current_user_id;

        INSERT INTO public.profiles (
          id,
          email,
          full_name,
          phone,
          agency_id
        )
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
            full_name = COALESCE(
              NULLIF(public.profiles.full_name, ''),
              EXCLUDED.full_name
            ),
            phone = COALESCE(
              NULLIF(public.profiles.phone, ''),
              EXCLUDED.phone
            );

        RETURN current_agency_id;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

REVOKE ALL ON FUNCTION public.ensure_agency_for_current_user(text, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_agency_for_current_user(text, text, text, text)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- Public view counter. Only published, non-archived properties are counted.
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regprocedure('public.increment_property_views(uuid)') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.increment_property_views(property_id uuid)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $function$
      BEGIN
        UPDATE public.properties
        SET views_count = views_count + 1
        WHERE id = property_id
          AND is_published = true
          AND archived_at IS NULL;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

REVOKE ALL ON FUNCTION public.increment_property_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_property_views(uuid)
  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Property image invariants: at most eight images, exactly one cover whenever
-- a property has images, and deterministic promotion after cover deletion.
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regprocedure('public.prepare_property_image_insert()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.prepare_property_image_insert()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
      AS $function$
      DECLARE
        image_count integer;
        has_cover boolean;
      BEGIN
        -- Lock the parent so concurrent uploads cannot exceed the limit.
        PERFORM 1
        FROM public.properties
        WHERE id = NEW.property_id
        FOR UPDATE;

        SELECT count(*), COALESCE(bool_or(is_cover), false)
        INTO image_count, has_cover
        FROM public.property_images
        WHERE property_id = NEW.property_id;

        IF image_count >= 8 THEN
          RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'A property cannot have more than 8 images.';
        END IF;

        IF NOT has_cover THEN
          NEW.is_cover = true;
        END IF;

        RETURN NEW;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF to_regprocedure('public.promote_property_image_cover()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.promote_property_image_cover()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
      AS $function$
      DECLARE
        next_cover_id uuid;
      BEGIN
        IF NOT OLD.is_cover THEN
          RETURN OLD;
        END IF;

        PERFORM 1
        FROM public.properties
        WHERE id = OLD.property_id
        FOR UPDATE;

        SELECT image.id
        INTO next_cover_id
        FROM public.property_images AS image
        WHERE image.property_id = OLD.property_id
        ORDER BY image."order" ASC, image.created_at ASC, image.id ASC
        LIMIT 1;

        IF next_cover_id IS NOT NULL THEN
          UPDATE public.property_images
          SET is_cover = true
          WHERE id = next_cover_id;
        END IF;

        RETURN OLD;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.property_images'::regclass
      AND tgname = 'property_images_prepare_insert'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER property_images_prepare_insert
      BEFORE INSERT ON public.property_images
      FOR EACH ROW EXECUTE FUNCTION public.prepare_property_image_insert();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.property_images'::regclass
      AND tgname = 'property_images_promote_cover'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER property_images_promote_cover
      AFTER DELETE ON public.property_images
      FOR EACH ROW EXECUTE FUNCTION public.promote_property_image_cover();
  END IF;
END
$$;

DO $migration$
BEGIN
  IF to_regprocedure('public.set_property_cover(uuid,uuid)') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.set_property_cover(
        target_property_id uuid,
        target_image_id uuid
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $function$
      DECLARE
        current_user_id uuid := auth.uid();
      BEGIN
        IF current_user_id IS NULL THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Authentication is required.';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.properties AS property
          JOIN public.agencies AS agency ON agency.id = property.agency_id
          WHERE property.id = target_property_id
            AND agency.owner_id = current_user_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'The property does not belong to the current agency.';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.property_images AS image
          WHERE image.id = target_image_id
            AND image.property_id = target_property_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'The selected image does not belong to the property.';
        END IF;

        PERFORM 1
        FROM public.properties
        WHERE id = target_property_id
        FOR UPDATE;

        UPDATE public.property_images
        SET is_cover = false
        WHERE property_id = target_property_id
          AND is_cover = true
          AND id <> target_image_id;

        UPDATE public.property_images
        SET is_cover = true
        WHERE id = target_image_id
          AND property_id = target_property_id;
      END;
      $function$;
    $definition$;
  END IF;
END
$migration$;

REVOKE ALL ON FUNCTION public.set_property_cover(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_property_cover(uuid, uuid)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- Contact counter used by the existing lead flow.
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regprocedure('public.increment_contacts_on_lead()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.increment_contacts_on_lead()
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
    $definition$;
  END IF;
END
$migration$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.leads'::regclass
      AND tgname = 'leads_increment_contacts'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER leads_increment_contacts
      AFTER INSERT ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.increment_contacts_on_lead();
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
