-- =============================================================================
-- Immo DZ — Phase 12: Sync Database Schema with Application Model
-- Run this in the Supabase SQL editor to ensure all application columns exist.
-- =============================================================================

-- Safely rename `bathroom` to `bathrooms` if it was misspelled in the original schema
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='bathroom') THEN
    ALTER TABLE public.properties RENAME COLUMN bathroom TO bathrooms;
  END IF;
END $$;

-- Add all missing columns for Phase 9 & Phase 10 idempotently
ALTER TABLE public.properties
  -- Phase 9: Publishing workflow
  ADD COLUMN IF NOT EXISTS slug text UNIQUE, -- URL-friendly identifier for the property
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false, -- Controls public visibility
  ADD COLUMN IF NOT EXISTS archived_at timestamptz, -- Soft deletion/archiving timestamp

  -- Phase 9: Extended details
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}', -- List of amenities (e.g., elevator, pool)
  ADD COLUMN IF NOT EXISTS nearby_places text[] NOT NULL DEFAULT '{}', -- Nearby POIs (e.g., school, hospital)
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}', -- Structural features (e.g., double glazing)
  ADD COLUMN IF NOT EXISTS energy_class text CHECK (energy_class IN ('A','B','C','D','E','F','G')), -- Energy efficiency rating
  ADD COLUMN IF NOT EXISTS construction_year integer CHECK (construction_year IS NULL OR (construction_year >= 1900 AND construction_year <= 2100)), -- Year built
  ADD COLUMN IF NOT EXISTS parking_spots integer NOT NULL DEFAULT 0, -- Number of parking spaces
  ADD COLUMN IF NOT EXISTS virtual_tour_url text, -- URL to Matterport/virtual tour
  ADD COLUMN IF NOT EXISTS video_url text, -- URL to YouTube/Vimeo video

  -- Phase 9: Multi-language support (French)
  ADD COLUMN IF NOT EXISTS title_fr text, -- French translation of the title
  ADD COLUMN IF NOT EXISTS description_fr text, -- French translation of the description

  -- Phase 9: Statistics counters
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0, -- Number of times the property page was viewed
  ADD COLUMN IF NOT EXISTS contacts_count integer NOT NULL DEFAULT 0; -- Number of times contact was initiated

-- Create an index on the slug for fast canonical URL lookups
CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_idx ON public.properties (slug) WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Ensure the schema cache is reloaded so PostgREST recognizes the new columns
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
