-- =============================================================================
-- Immo DZ - P2 / 009: social publishing foundation
--
-- Draft preparation only. No queue, publisher, n8n, Meta credential, or webhook
-- is introduced here. The migration is additive, idempotent, and non-destructive.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.social_publications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  property_id         uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  channel             text NOT NULL CHECK (channel IN ('facebook', 'instagram')),
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'publishing', 'published', 'failed')),
  approved_content    text NOT NULL
    CHECK (
      (
        (channel = 'facebook' AND char_length(btrim(approved_content)) BETWEEN 1 AND 2000)
        OR (channel = 'instagram' AND char_length(btrim(approved_content)) BETWEEN 1 AND 1500)
      )
      AND approved_content !~* '<[^>]*>|javascript:|data:text/html|https?://|www\.'
      AND approved_content !~ '[[:cntrl:]]'
    ),
  external_post_id   text,
  external_post_url  text,
  requested_at       timestamptz,
  published_at       timestamptz,
  last_error_code    text,
  retry_count        integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, channel)
);

CREATE INDEX IF NOT EXISTS social_publications_agency_status_idx
  ON public.social_publications (agency_id, status, updated_at DESC);

-- A cover is resolved from the existing trusted Storage URL architecture. The
-- URL itself is never accepted from the browser or persisted in this table.
CREATE OR REPLACE FUNCTION public.has_trusted_social_cover(target_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_images AS image
    WHERE image.property_id = target_property_id
      AND image.is_cover = true
      AND lower(image.url) LIKE lower(
        '%/storage/v1/object/public/property-photos/'
        || target_property_id::text
        || '/%'
      )
      AND image.url ~* '\.(jpg|png|webp)$'
  );
$function$;

-- State guard: P2 may insert/update only draft rows. Future trusted P3 code may
-- use the remaining transitions, but invalid transitions and browser-controlled
-- publication result fields are rejected at the database boundary.
CREATE OR REPLACE FUNCTION public.guard_social_publication_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'
       OR NEW.external_post_id IS NOT NULL
       OR NEW.external_post_url IS NOT NULL
       OR NEW.requested_at IS NOT NULL
       OR NEW.published_at IS NOT NULL
       OR NEW.last_error_code IS NOT NULL
       OR NEW.retry_count <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Only a clean draft may be created.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.agency_id IS DISTINCT FROM OLD.agency_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.channel IS DISTINCT FROM OLD.channel THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Social publication identity is immutable.';
  END IF;

  IF OLD.status <> 'draft' OR NEW.status <> 'draft' THEN
    IF NEW.approved_content IS DISTINCT FROM OLD.approved_content THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Approved social content is frozen after queueing.';
    END IF;
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
    IF NEW.external_post_id IS DISTINCT FROM OLD.external_post_id
       OR NEW.external_post_url IS DISTINCT FROM OLD.external_post_url
       OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.last_error_code IS DISTINCT FROM OLD.last_error_code
       OR NEW.retry_count IS DISTINCT FROM OLD.retry_count THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Draft publication result fields are read-only.';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'queued')
    OR (OLD.status = 'queued' AND NEW.status = 'publishing')
    OR (OLD.status = 'publishing' AND NEW.status IN ('published', 'failed'))
    OR (OLD.status = 'failed' AND NEW.status = 'queued')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid social publication state transition.';
  END IF;

  IF NEW.status = 'published'
     AND (NEW.external_post_id IS NULL
       OR NEW.external_post_url IS NULL
       OR NEW.published_at IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A published social row requires a trusted publication result.';
  END IF;

  RETURN NEW;
END;
$function$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.social_publications'::regclass
      AND tgname = 'social_publications_guard_state'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER social_publications_guard_state
      BEFORE INSERT OR UPDATE ON public.social_publications
      FOR EACH ROW EXECUTE FUNCTION public.guard_social_publication_state();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.social_publications'::regclass
      AND tgname = 'social_publications_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER social_publications_set_updated_at
      BEFORE UPDATE ON public.social_publications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$migration$;

ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_publications_select_own
  ON public.social_publications;
CREATE POLICY social_publications_select_own
ON public.social_publications
FOR SELECT TO authenticated
USING (public.current_user_owns_agency(agency_id));

-- Mutations are available only through the scoped RPCs below. This prevents
-- browser callers from choosing agency ownership or publication result fields.
REVOKE ALL PRIVILEGES ON TABLE public.social_publications FROM anon, authenticated;
GRANT SELECT ON TABLE public.social_publications TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_social_publication(
  target_property_id uuid,
  target_channel text,
  target_content text
)
RETURNS SETOF public.social_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  existing_status text;
BEGIN
  SELECT profile.agency_id
  INTO current_agency_id
  FROM public.profiles AS profile
  JOIN public.agencies AS agency ON agency.id = profile.agency_id
  WHERE profile.id = auth.uid()
    AND agency.owner_id = auth.uid();

  IF current_agency_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An owned agency is required.';
  END IF;

  IF target_channel NOT IN ('facebook', 'instagram') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported social channel.';
  END IF;

  IF target_content IS NULL
     OR char_length(btrim(target_content)) = 0
     OR (
       (target_channel = 'facebook' AND char_length(target_content) > 2000)
       OR (target_channel = 'instagram' AND char_length(target_content) > 1500)
     )
     OR target_content ~* '<[^>]*>|javascript:|data:text/html|https?://|www\.'
     OR target_content ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Social content is invalid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = target_property_id
      AND property.agency_id = current_agency_id
      AND property.is_published = true
      AND property.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'The property must be published and owned by the current agency.';
  END IF;

  IF NOT public.has_trusted_social_cover(target_property_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'A trusted property cover image is required.';
  END IF;

  SELECT publication.status
  INTO existing_status
  FROM public.social_publications AS publication
  WHERE publication.property_id = target_property_id
    AND publication.channel = target_channel
    AND publication.agency_id = current_agency_id
  FOR UPDATE;

  IF existing_status IS NOT NULL AND existing_status <> 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Only draft social content can be edited in P2.';
  END IF;

  RETURN QUERY
  INSERT INTO public.social_publications (
    agency_id, property_id, channel, status, approved_content
  )
  VALUES (
    current_agency_id, target_property_id, target_channel, 'draft', btrim(target_content)
  )
  ON CONFLICT (property_id, channel)
  DO UPDATE SET
    approved_content = EXCLUDED.approved_content,
    updated_at = now()
  RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_social_publication_content(
  target_publication_id uuid,
  target_content text
)
RETURNS SETOF public.social_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  target_property_id uuid;
  target_channel text;
  existing_status text;
BEGIN
  SELECT profile.agency_id
  INTO current_agency_id
  FROM public.profiles AS profile
  JOIN public.agencies AS agency ON agency.id = profile.agency_id
  WHERE profile.id = auth.uid()
    AND agency.owner_id = auth.uid();

  IF current_agency_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An owned agency is required.';
  END IF;

  SELECT publication.property_id, publication.channel, publication.status
  INTO target_property_id, target_channel, existing_status
  FROM public.social_publications AS publication
  WHERE publication.id = target_publication_id
    AND publication.agency_id = current_agency_id
  FOR UPDATE;

  IF target_property_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The social publication is not accessible.';
  END IF;

  IF existing_status <> 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Only draft social content can be edited in P2.';
  END IF;

  IF target_content IS NULL
     OR char_length(btrim(target_content)) = 0
     OR (
       (target_channel = 'facebook' AND char_length(target_content) > 2000)
       OR (target_channel = 'instagram' AND char_length(target_content) > 1500)
     )
     OR target_content ~* '<[^>]*>|javascript:|data:text/html|https?://|www\.'
     OR target_content ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Social content is invalid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = target_property_id
      AND property.agency_id = current_agency_id
      AND property.is_published = true
      AND property.archived_at IS NULL
  ) OR NOT public.has_trusted_social_cover(target_property_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'The published property and trusted cover are required.';
  END IF;

  RETURN QUERY
  UPDATE public.social_publications AS publication
  SET approved_content = btrim(target_content), updated_at = now()
  WHERE publication.id = target_publication_id
    AND publication.agency_id = current_agency_id
  RETURNING publication.*;
END;
$function$;

REVOKE ALL ON FUNCTION public.has_trusted_social_cover(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_social_publication_state()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_social_publication(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_social_publication_content(uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_social_publication(uuid, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_social_publication_content(uuid, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
