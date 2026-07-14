-- =============================================================================
-- Immo DZ — Phase 9: Production-ready property module
-- Run this in the Supabase SQL editor AFTER the existing schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Publishing workflow columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slug          text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_published  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at   timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_idx ON public.properties (slug)
  WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Extended property details
-- ---------------------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS amenities         text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nearby_places     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_class      text CHECK (energy_class IN ('A','B','C','D','E','F','G')),
  ADD COLUMN IF NOT EXISTS construction_year integer CHECK (construction_year IS NULL OR (construction_year >= 1900 AND construction_year <= 2100)),
  ADD COLUMN IF NOT EXISTS parking_spots     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_tour_url  text,
  ADD COLUMN IF NOT EXISTS video_url         text;

-- ---------------------------------------------------------------------------
-- 3. Multi-language fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS title_fr       text,
  ADD COLUMN IF NOT EXISTS description_fr text;

-- ---------------------------------------------------------------------------
-- 4. Statistics counters
-- ---------------------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS views_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contacts_count integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5. Image enhancements
-- ---------------------------------------------------------------------------

ALTER TABLE public.property_images
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS is_cover      boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 6. Mark existing properties as published (backward compat)
-- ---------------------------------------------------------------------------

UPDATE public.properties SET is_published = true WHERE is_published = false;

-- ---------------------------------------------------------------------------
-- 7. RPC: Atomic view increment (avoids race conditions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_property_views(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE properties
  SET views_count = views_count + 1
  WHERE id = property_id;
END;
$$;
