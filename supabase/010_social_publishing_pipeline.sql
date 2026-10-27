-- =============================================================================
-- Immo DZ - P3 / 010: trusted social publishing pipeline
--
-- Adds durable publish attempts and narrow RPC boundaries. Queueing is
-- authenticated-user scoped; delivery and result transitions are service-role
-- only. This migration must be reviewed and applied manually.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.social_publication_attempts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id           uuid NOT NULL REFERENCES public.social_publications (id) ON DELETE CASCADE,
  event_id                 uuid NOT NULL UNIQUE,
  attempt_no               integer NOT NULL CHECK (attempt_no > 0),
  status                   text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'publishing', 'published', 'failed')),
  delivery_attempt_count   integer NOT NULL DEFAULT 0 CHECK (delivery_attempt_count >= 0),
  requested_at             timestamptz NOT NULL DEFAULT now(),
  completed_at             timestamptz,
  last_error_code          text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS social_publication_attempts_publication_idx
  ON public.social_publication_attempts (publication_id, attempt_no DESC);

CREATE UNIQUE INDEX IF NOT EXISTS social_publication_attempts_active_idx
  ON public.social_publication_attempts (publication_id)
  WHERE status IN ('queued', 'publishing');

CREATE OR REPLACE FUNCTION public.guard_social_publication_attempt_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'queued'
       OR NEW.attempt_no <= 0
       OR NEW.delivery_attempt_count < 0
       OR NEW.completed_at IS NOT NULL
       OR NEW.last_error_code IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Only a clean queued social attempt may be created.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.publication_id IS DISTINCT FROM OLD.publication_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.attempt_no IS DISTINCT FROM OLD.attempt_no THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Social attempt identity is immutable.';
  END IF;

  IF NEW.delivery_attempt_count < OLD.delivery_attempt_count THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Delivery attempt count cannot decrease.';
  END IF;

  IF OLD.status IN ('published', 'failed')
     AND (NEW.status IS DISTINCT FROM OLD.status
       OR NEW.delivery_attempt_count IS DISTINCT FROM OLD.delivery_attempt_count
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.last_error_code IS DISTINCT FROM OLD.last_error_code) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A terminal social attempt is immutable.';
  END IF;

  IF NOT (
    (OLD.status = 'queued' AND NEW.status IN ('queued', 'publishing'))
    OR (OLD.status = 'publishing' AND NEW.status IN ('publishing', 'published', 'failed'))
    OR (OLD.status IN ('published', 'failed') AND NEW.status = OLD.status)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid social attempt state transition.';
  END IF;

  IF NEW.status IN ('published', 'failed') AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A terminal social attempt requires a completion timestamp.';
  END IF;

  RETURN NEW;
END;
$function$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.social_publication_attempts'::regclass
      AND tgname = 'social_publication_attempts_guard_state'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER social_publication_attempts_guard_state
      BEFORE INSERT OR UPDATE ON public.social_publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.guard_social_publication_attempt_state();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.social_publication_attempts'::regclass
      AND tgname = 'social_publication_attempts_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER social_publication_attempts_set_updated_at
      BEFORE UPDATE ON public.social_publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$migration$;

ALTER TABLE public.social_publication_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_publication_attempts_select_own
  ON public.social_publication_attempts;
CREATE POLICY social_publication_attempts_select_own
ON public.social_publication_attempts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.social_publications AS publication
    WHERE publication.id = publication_id
      AND public.current_user_owns_agency(publication.agency_id)
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.social_publication_attempts FROM anon, authenticated;
GRANT SELECT ON TABLE public.social_publication_attempts TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_social_publication(target_publication_id uuid)
RETURNS TABLE (
  publication_id uuid,
  agency_id uuid,
  property_id uuid,
  channel text,
  approved_content text,
  attempt_id uuid,
  event_id uuid,
  attempt_no integer,
  publication_status text,
  attempt_status text,
  delivery_attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  publication_row public.social_publications%ROWTYPE;
  attempt_row public.social_publication_attempts%ROWTYPE;
  next_attempt_no integer;
BEGIN
  SELECT profile.agency_id INTO current_agency_id
  FROM public.profiles AS profile
  JOIN public.agencies AS agency ON agency.id = profile.agency_id
  WHERE profile.id = auth.uid() AND agency.owner_id = auth.uid();

  IF current_agency_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An owned agency is required.';
  END IF;

  SELECT publication.* INTO publication_row
  FROM public.social_publications AS publication
  WHERE publication.id = target_publication_id
    AND publication.agency_id = current_agency_id
  FOR UPDATE;

  IF publication_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The social publication is not accessible.';
  END IF;

  IF publication_row.status IN ('queued', 'publishing') THEN
    SELECT attempt.* INTO attempt_row
    FROM public.social_publication_attempts AS attempt
    WHERE attempt.publication_id = publication_row.id
      AND attempt.status IN ('queued', 'publishing')
    ORDER BY attempt.attempt_no DESC
    LIMIT 1
    FOR UPDATE;

    IF attempt_row.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The active social attempt is missing.';
    END IF;
  ELSIF publication_row.status IN ('draft', 'failed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.properties AS property
      WHERE property.id = publication_row.property_id
        AND property.agency_id = current_agency_id
        AND property.is_published = true
        AND property.archived_at IS NULL
    ) OR NOT public.has_trusted_social_cover(publication_row.property_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'The published property and trusted cover are required.';
    END IF;

    SELECT COALESCE(MAX(attempt.attempt_no), 0) + 1 INTO next_attempt_no
    FROM public.social_publication_attempts AS attempt
    WHERE attempt.publication_id = publication_row.id;

    INSERT INTO public.social_publication_attempts (
      publication_id, event_id, attempt_no, status
    )
    VALUES (
      publication_row.id, gen_random_uuid(), next_attempt_no, 'queued'
    )
    RETURNING * INTO attempt_row;

    UPDATE public.social_publications AS publication
    SET status = 'queued',
        requested_at = now(),
        last_error_code = NULL,
        retry_count = CASE
          WHEN publication_row.status = 'failed' THEN publication_row.retry_count + 1
          ELSE publication_row.retry_count
        END,
        updated_at = now()
    WHERE publication.id = publication_row.id
    RETURNING publication.* INTO publication_row;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This social publication is already complete.';
  END IF;

  RETURN QUERY SELECT publication_row.id, publication_row.agency_id,
    publication_row.property_id, publication_row.channel,
    publication_row.approved_content, attempt_row.id, attempt_row.event_id,
    attempt_row.attempt_no, publication_row.status, attempt_row.status,
    attempt_row.delivery_attempt_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_social_publication_delivery(
  target_publication_id uuid,
  target_event_id uuid
)
RETURNS public.social_publication_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  attempt_row public.social_publication_attempts%ROWTYPE;
BEGIN
  SELECT attempt.* INTO attempt_row
  FROM public.social_publication_attempts AS attempt
  JOIN public.social_publications AS publication ON publication.id = attempt.publication_id
  WHERE attempt.publication_id = target_publication_id
    AND attempt.event_id = target_event_id
    AND attempt.status IN ('queued', 'publishing')
  FOR UPDATE;

  IF attempt_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The social attempt is not accessible.';
  END IF;

  UPDATE public.social_publication_attempts
  SET delivery_attempt_count = delivery_attempt_count + 1,
      updated_at = now()
  WHERE id = attempt_row.id
  RETURNING * INTO attempt_row;

  RETURN attempt_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_social_publication_publishing(
  target_publication_id uuid,
  target_event_id uuid
)
RETURNS TABLE (publication_status text, attempt_status text, attempt_id uuid, event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  publication_row public.social_publications%ROWTYPE;
  attempt_row public.social_publication_attempts%ROWTYPE;
BEGIN
  SELECT publication.* INTO publication_row
  FROM public.social_publications AS publication
  WHERE publication.id = target_publication_id
  FOR UPDATE;

  SELECT attempt.* INTO attempt_row
  FROM public.social_publication_attempts AS attempt
  WHERE attempt.publication_id = target_publication_id
    AND attempt.event_id = target_event_id
  FOR UPDATE;

  IF publication_row.id IS NULL OR attempt_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The social attempt is not accessible.';
  END IF;

  IF publication_row.status IN ('published', 'failed')
     AND attempt_row.status = publication_row.status THEN
    RETURN QUERY SELECT publication_row.status, attempt_row.status,
      attempt_row.id, attempt_row.event_id;
    RETURN;
  END IF;

  IF publication_row.status = 'queued' AND attempt_row.status = 'queued' THEN
    UPDATE public.social_publications
    SET status = 'publishing', updated_at = now()
    WHERE id = publication_row.id;
    UPDATE public.social_publication_attempts
    SET status = 'publishing', updated_at = now()
    WHERE id = attempt_row.id;
    publication_row.status := 'publishing';
    attempt_row.status := 'publishing';
  ELSIF publication_row.status <> 'publishing'
     OR attempt_row.status <> 'publishing' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The social attempt is not publishable.';
  END IF;

  RETURN QUERY SELECT publication_row.status, attempt_row.status,
    attempt_row.id, attempt_row.event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_social_publication_result(
  target_event_id uuid,
  target_publication_id uuid,
  target_status text,
  target_external_post_id text DEFAULT NULL,
  target_external_post_url text DEFAULT NULL,
  target_error_code text DEFAULT NULL
)
RETURNS TABLE (publication_status text, attempt_status text, attempt_id uuid, event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  publication_row public.social_publications%ROWTYPE;
  attempt_row public.social_publication_attempts%ROWTYPE;
BEGIN
  IF target_status NOT IN ('published', 'failed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported social result status.';
  END IF;

  SELECT publication.* INTO publication_row
  FROM public.social_publications AS publication
  WHERE publication.id = target_publication_id
  FOR UPDATE;

  SELECT attempt.* INTO attempt_row
  FROM public.social_publication_attempts AS attempt
  WHERE attempt.publication_id = target_publication_id
    AND attempt.event_id = target_event_id
  FOR UPDATE;

  IF publication_row.id IS NULL OR attempt_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The social result is not recognized.';
  END IF;

  IF target_status = 'published'
     AND (target_external_post_id IS NULL
       OR target_external_post_url IS NULL
       OR target_error_code IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A published result requires only external publication fields.';
  END IF;
  IF target_status = 'failed'
     AND (target_error_code IS NULL
       OR target_external_post_id IS NOT NULL
       OR target_external_post_url IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A failed result requires only an error code.';
  END IF;

  IF attempt_row.status IN ('published', 'failed') THEN
    IF publication_row.status IS DISTINCT FROM attempt_row.status THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Social publication and attempt states are inconsistent.';
    END IF;
    IF attempt_row.status = target_status
       AND ((target_status = 'failed' AND attempt_row.last_error_code IS NOT DISTINCT FROM target_error_code)
         OR (target_status = 'published'
           AND publication_row.external_post_id IS NOT DISTINCT FROM target_external_post_id
           AND publication_row.external_post_url IS NOT DISTINCT FROM target_external_post_url)) THEN
      RETURN QUERY SELECT publication_row.status, attempt_row.status,
        attempt_row.id, attempt_row.event_id;
      RETURN;
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Conflicting social result callback.';
  END IF;

  IF attempt_row.status = 'queued' THEN
    IF publication_row.status <> 'queued' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The social publication state is inconsistent.';
    END IF;
    UPDATE public.social_publications
    SET status = 'publishing', updated_at = now()
    WHERE id = publication_row.id;
    UPDATE public.social_publication_attempts
    SET status = 'publishing', updated_at = now()
    WHERE id = attempt_row.id;
    publication_row.status := 'publishing';
    attempt_row.status := 'publishing';
  ELSIF attempt_row.status <> 'publishing' OR publication_row.status <> 'publishing' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The social attempt is not active.';
  END IF;

  IF target_status = 'published' THEN
    IF target_external_post_id IS NULL
       OR char_length(btrim(target_external_post_id)) NOT BETWEEN 1 AND 255
       OR target_external_post_url IS NULL
       OR char_length(target_external_post_url) > 2048
       OR target_error_code IS NOT NULL
       OR (
         (publication_row.channel = 'facebook'
           AND target_external_post_url !~* '^https://(www\.)?facebook\.com(/|$)')
         OR (publication_row.channel = 'instagram'
           AND target_external_post_url !~* '^https://(www\.)?instagram\.com(/|$)')
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The external social URL is invalid.';
    END IF;
    UPDATE public.social_publications
    SET status = 'published',
        external_post_id = btrim(target_external_post_id),
        external_post_url = target_external_post_url,
        published_at = now(),
        last_error_code = NULL,
        updated_at = now()
    WHERE id = publication_row.id;
  ELSE
    IF target_error_code IS NULL
       OR target_error_code !~ '^[A-Za-z0-9_.:-]{1,100}$'
       OR target_external_post_id IS NOT NULL
       OR target_external_post_url IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The social failure code is invalid.';
    END IF;
    UPDATE public.social_publications
    SET status = 'failed',
        last_error_code = target_error_code,
        updated_at = now()
    WHERE id = publication_row.id;
  END IF;

  UPDATE public.social_publication_attempts
  SET status = target_status,
      completed_at = now(),
      last_error_code = CASE WHEN target_status = 'failed' THEN target_error_code ELSE NULL END,
      updated_at = now()
  WHERE id = attempt_row.id
  RETURNING * INTO attempt_row;

  RETURN QUERY SELECT target_status, attempt_row.status,
    attempt_row.id, attempt_row.event_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_social_publication_attempt_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_social_publication(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_social_publication_delivery(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_social_publication_publishing(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_social_publication_result(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.queue_social_publication(uuid) TO authenticated;
-- These operations are trusted-publisher boundaries. They are callable only by
-- the server-side Supabase service-role client after delivery/callback checks.
GRANT EXECUTE ON FUNCTION public.record_social_publication_delivery(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_social_publication_publishing(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_social_publication_result(uuid, uuid, text, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
