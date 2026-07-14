-- =============================================================================
-- Immo DZ — Master Schema Upgrade (Phase 8 to Current)
-- Purpose: Safely upgrades an existing database to the complete current schema.
-- Idempotent: Can be run multiple times safely without dropping data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AGENCIES (Phase 1-4 sync)
-- ---------------------------------------------------------------------------
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS about text;

-- ---------------------------------------------------------------------------
-- 2. PROPERTY IMAGES (Phase 9 sync)
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_images
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 3. PROPERTIES (Phase 9 sync)
-- ---------------------------------------------------------------------------

-- Safely rename `bathroom` to `bathrooms` if it was misspelled in earlier phases
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='bathroom') THEN
    ALTER TABLE public.properties RENAME COLUMN bathroom TO bathrooms;
  END IF;
END $$;

ALTER TABLE public.properties
  -- Publishing workflow
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,

  -- Extended details
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nearby_places text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_class text CHECK (energy_class IN ('A','B','C','D','E','F','G')),
  ADD COLUMN IF NOT EXISTS construction_year integer CHECK (construction_year IS NULL OR (construction_year >= 1900 AND construction_year <= 2100)),
  ADD COLUMN IF NOT EXISTS parking_spots integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_tour_url text,
  ADD COLUMN IF NOT EXISTS video_url text,

  -- Multi-language support
  ADD COLUMN IF NOT EXISTS title_fr text,
  ADD COLUMN IF NOT EXISTS description_fr text,

  -- Statistics counters
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contacts_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_idx ON public.properties (slug) WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. LEADS (Phase 10 CRM)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  type        text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'visit', 'reservation')),
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visit_scheduled', 'visited', 'negotiating', 'converted', 'lost')),
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text,
  message     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_agency_id_idx    ON public.leads (agency_id);
CREATE INDEX IF NOT EXISTS leads_property_id_idx  ON public.leads (property_id);
CREATE INDEX IF NOT EXISTS leads_status_idx       ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx   ON public.leads (created_at DESC);

-- Trigger: auto-update `updated_at` on leads
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-increment `contacts_count` on properties when lead is created
CREATE OR REPLACE FUNCTION public.increment_contacts_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    UPDATE properties
    SET contacts_count = contacts_count + 1
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_increment_contacts ON public.leads;
CREATE TRIGGER leads_increment_contacts
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.increment_contacts_on_lead();

-- RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leads_select_agency" ON public.leads;
CREATE POLICY "leads_select_agency" ON public.leads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

DROP POLICY IF EXISTS "leads_update_agency" ON public.leads;
CREATE POLICY "leads_update_agency" ON public.leads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

DROP POLICY IF EXISTS "leads_delete_agency" ON public.leads;
CREATE POLICY "leads_delete_agency" ON public.leads FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. INTERACTIONS (Phase 10 & 11 Anonymous Tracking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event       text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interactions_property_id_idx ON public.interactions (property_id);
CREATE INDEX IF NOT EXISTS interactions_agency_id_idx   ON public.interactions (agency_id);
CREATE INDEX IF NOT EXISTS interactions_event_idx       ON public.interactions (event);

-- Phase 11 Sharing Tracker Check Constraint
-- Drop if exists and recreate to ensure all new events are supported
ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_event_check;
ALTER TABLE public.interactions ADD CONSTRAINT interactions_event_check CHECK (
  event IN (
    'phone_click', 'whatsapp_click', 'share', 'favorite', 'property_view',
    'copy_link', 'native_share', 'whatsapp_share', 'facebook_share', 'telegram_share', 'email_share', 'qr_code_opened', 'qr_code_downloaded'
  )
);

-- RLS for interactions
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_insert_public" ON public.interactions;
CREATE POLICY "interactions_insert_public" ON public.interactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "interactions_select_agency" ON public.interactions;
CREATE POLICY "interactions_select_agency" ON public.interactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. STORAGE BUCKET (Image Storage Setup)
-- ---------------------------------------------------------------------------

-- Public bucket for property photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read objects in the bucket
DROP POLICY IF EXISTS "property_photos_public_read" ON storage.objects;
CREATE POLICY "property_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'property-photos');

-- Authenticated users can write
DROP POLICY IF EXISTS "property_photos_auth_insert" ON storage.objects;
CREATE POLICY "property_photos_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "property_photos_auth_update" ON storage.objects;
CREATE POLICY "property_photos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "property_photos_auth_delete" ON storage.objects;
CREATE POLICY "property_photos_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-photos');

-- ---------------------------------------------------------------------------
-- 7. CACHE RELOAD
-- Forces PostgREST to immediately recognize the new columns and schemas
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
