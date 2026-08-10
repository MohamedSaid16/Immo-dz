-- =============================================================================
-- Immo DZ - P1 / 008: durable per-agency AI generation quota
--
-- Additive and idempotent. This migration stores only daily counters and short-
-- lived reservations. It never stores prompts, generated content, API keys, or
-- provider responses. All agency ownership is derived from auth.uid().
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_ai_usage_daily (
  agency_id       uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  usage_date      date NOT NULL,
  generation_count integer NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  reserved_count  integer NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.agency_ai_generation_reservations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  usage_date   date NOT NULL,
  status       text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'completed', 'released')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  completed_at timestamptz
);

ALTER TABLE public.agency_ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_ai_generation_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_ai_usage_daily_select_own
  ON public.agency_ai_usage_daily;
CREATE POLICY agency_ai_usage_daily_select_own
ON public.agency_ai_usage_daily
FOR SELECT TO authenticated
USING (public.current_user_owns_agency(agency_id));

-- Reservations are intentionally inaccessible through direct table access. The
-- narrowly scoped RPCs below are the only API for reserving, completing, or
-- releasing quota.

REVOKE ALL PRIVILEGES ON TABLE
  public.agency_ai_usage_daily,
  public.agency_ai_generation_reservations
FROM anon, authenticated;

GRANT SELECT ON TABLE public.agency_ai_usage_daily TO authenticated;

CREATE INDEX IF NOT EXISTS agency_ai_reservations_active_idx
  ON public.agency_ai_generation_reservations (agency_id, usage_date, status, expires_at);

-- -----------------------------------------------------------------------------
-- Reserve one operation atomically. The current agency is derived from the
-- authenticated profile and owner relationship; no agency id is accepted.
-- Expired reservations are reaped while the usage row is locked.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_ai_generation(
  requested_limit integer
)
RETURNS TABLE (
  allowed boolean,
  reservation_id uuid,
  usage_date date,
  generation_count integer,
  reserved_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  today date := current_date;
  active_reserved integer := 0;
  usage_generation_count integer := 0;
  new_reservation_id uuid;
BEGIN
  IF requested_limit IS NULL OR requested_limit < 1 OR requested_limit > 10000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'AI quota limit is invalid.';
  END IF;

  -- The database is authoritative for the pilot quota. A caller may provide a
  -- smaller limit, but can never raise the agency maximum above 20 operations.
  requested_limit := LEAST(requested_limit, 20);

  SELECT profile.agency_id
  INTO current_agency_id
  FROM public.profiles AS profile
  JOIN public.agencies AS agency ON agency.id = profile.agency_id
  WHERE profile.id = auth.uid()
    AND agency.owner_id = auth.uid();

  IF current_agency_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An owned agency is required.';
  END IF;

  INSERT INTO public.agency_ai_usage_daily (agency_id, usage_date)
  VALUES (current_agency_id, today)
  ON CONFLICT (agency_id, usage_date) DO NOTHING;

  SELECT usage.generation_count
  INTO usage_generation_count
  FROM public.agency_ai_usage_daily AS usage
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = today
  FOR UPDATE;

  UPDATE public.agency_ai_generation_reservations AS reservation
  SET status = 'released',
      completed_at = now()
  WHERE reservation.agency_id = current_agency_id
    AND reservation.usage_date = today
    AND reservation.status = 'reserved'
    AND reservation.expires_at <= now();

  SELECT count(*)::integer
  INTO active_reserved
  FROM public.agency_ai_generation_reservations AS reservation
  WHERE reservation.agency_id = current_agency_id
    AND reservation.usage_date = today
    AND reservation.status = 'reserved'
    AND reservation.expires_at > now();

  UPDATE public.agency_ai_usage_daily AS usage
  SET reserved_count = active_reserved,
      updated_at = now()
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = today;

  IF usage_generation_count + active_reserved >= requested_limit THEN
    RETURN QUERY SELECT false, NULL::uuid, today, usage_generation_count, active_reserved;
    RETURN;
  END IF;

  INSERT INTO public.agency_ai_generation_reservations (
    agency_id, usage_date, status, expires_at
  )
  VALUES (
    current_agency_id, today, 'reserved', now() + interval '10 minutes'
  )
  RETURNING id INTO new_reservation_id;

  active_reserved := active_reserved + 1;

  UPDATE public.agency_ai_usage_daily AS usage
  SET reserved_count = active_reserved,
      updated_at = now()
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = today;

  RETURN QUERY SELECT true, new_reservation_id, today, usage_generation_count, active_reserved;
END;
$function$;

-- Mark a successful provider response as one completed operation.
CREATE OR REPLACE FUNCTION public.complete_ai_generation(
  reservation_id uuid
)
RETURNS TABLE (
  completed boolean,
  usage_date date,
  generation_count integer,
  reserved_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  reservation_date date;
  reservation_status text;
  current_generation_count integer;
  current_reserved_count integer;
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

  SELECT reservation.usage_date
  INTO reservation_date
  FROM public.agency_ai_generation_reservations AS reservation
  WHERE reservation.id = reservation_id
    AND reservation.agency_id = current_agency_id;

  IF reservation_date IS NULL THEN
    RETURN QUERY SELECT false, current_date, 0, 0;
    RETURN;
  END IF;

  SELECT usage.generation_count, usage.reserved_count
  INTO current_generation_count, current_reserved_count
  FROM public.agency_ai_usage_daily AS usage
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date
  FOR UPDATE;

  SELECT reservation.status
  INTO reservation_status
  FROM public.agency_ai_generation_reservations AS reservation
  WHERE reservation.id = reservation_id
    AND reservation.agency_id = current_agency_id
  FOR UPDATE;

  IF reservation_status <> 'reserved' THEN
    RETURN QUERY SELECT false, reservation_date, COALESCE(current_generation_count, 0), COALESCE(current_reserved_count, 0);
    RETURN;
  END IF;

  UPDATE public.agency_ai_generation_reservations
  SET status = 'completed', completed_at = now()
  WHERE id = reservation_id;

  UPDATE public.agency_ai_usage_daily AS usage
  SET generation_count = usage.generation_count + 1,
      reserved_count = GREATEST(usage.reserved_count - 1, 0),
      updated_at = now()
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date;

  SELECT usage.generation_count, usage.reserved_count
  INTO current_generation_count, current_reserved_count
  FROM public.agency_ai_usage_daily AS usage
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date;

  RETURN QUERY SELECT true, reservation_date, current_generation_count, current_reserved_count;
END;
$function$;

-- Release a reservation when the provider fails before usable content is
-- returned. Ownership is derived from auth.uid(); the caller cannot release a
-- reservation belonging to another agency.
CREATE OR REPLACE FUNCTION public.release_ai_generation(
  reservation_id uuid
)
RETURNS TABLE (
  released boolean,
  usage_date date,
  generation_count integer,
  reserved_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_agency_id uuid;
  reservation_date date;
  reservation_status text;
  current_generation_count integer;
  current_reserved_count integer;
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

  SELECT reservation.usage_date
  INTO reservation_date
  FROM public.agency_ai_generation_reservations AS reservation
  WHERE reservation.id = reservation_id
    AND reservation.agency_id = current_agency_id;

  IF reservation_date IS NULL THEN
    RETURN QUERY SELECT false, current_date, 0, 0;
    RETURN;
  END IF;

  SELECT usage.generation_count, usage.reserved_count
  INTO current_generation_count, current_reserved_count
  FROM public.agency_ai_usage_daily AS usage
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date
  FOR UPDATE;

  SELECT reservation.status
  INTO reservation_status
  FROM public.agency_ai_generation_reservations AS reservation
  WHERE reservation.id = reservation_id
    AND reservation.agency_id = current_agency_id
  FOR UPDATE;

  IF reservation_status <> 'reserved' THEN
    RETURN QUERY SELECT false, reservation_date, COALESCE(current_generation_count, 0), COALESCE(current_reserved_count, 0);
    RETURN;
  END IF;

  UPDATE public.agency_ai_generation_reservations
  SET status = 'released', completed_at = now()
  WHERE id = reservation_id;

  UPDATE public.agency_ai_usage_daily AS usage
  SET reserved_count = GREATEST(usage.reserved_count - 1, 0),
      updated_at = now()
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date;

  SELECT usage.generation_count, usage.reserved_count
  INTO current_generation_count, current_reserved_count
  FROM public.agency_ai_usage_daily AS usage
  WHERE usage.agency_id = current_agency_id
    AND usage.usage_date = reservation_date;

  RETURN QUERY SELECT true, reservation_date, current_generation_count, current_reserved_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_ai_generation(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_generation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_generation(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_generation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_generation(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
