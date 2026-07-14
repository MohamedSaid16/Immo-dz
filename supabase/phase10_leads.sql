-- =============================================================================
-- Immo DZ — Phase 10: Lead Management System
-- Run this in the Supabase SQL editor AFTER phase9_property_module.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Leads table — intentional visitor inquiries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,

  -- Classification
  type        text NOT NULL DEFAULT 'info'
              CHECK (type IN ('info', 'visit', 'reservation')),
  status      text NOT NULL DEFAULT 'new'
              CHECK (status IN (
                'new', 'contacted', 'visit_scheduled',
                'visited', 'negotiating', 'converted', 'lost'
              )),

  -- Visitor data
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text,
  message     text,

  -- Agency management (extensible: future notes, appointments, attachments)
  notes       text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Interactions table — anonymous event tracking (separate domain)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  event       text NOT NULL
              CHECK (event IN (
                'phone_click', 'whatsapp_click', 'share',
                'favorite', 'property_view'
              )),

  -- Optional metadata (e.g., referrer, device)
  metadata    jsonb DEFAULT '{}',

  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS leads_agency_id_idx    ON public.leads (agency_id);
CREATE INDEX IF NOT EXISTS leads_property_id_idx  ON public.leads (property_id);
CREATE INDEX IF NOT EXISTS leads_status_idx       ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx   ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS interactions_property_id_idx ON public.interactions (property_id);
CREATE INDEX IF NOT EXISTS interactions_agency_id_idx   ON public.interactions (agency_id);
CREATE INDEX IF NOT EXISTS interactions_event_idx       ON public.interactions (event);

-- ---------------------------------------------------------------------------
-- 4. Auto-update updated_at on leads
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Auto-increment contacts_count on properties when a lead is created
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6. Row Level Security — Leads
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (visitors, no auth required)
DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Only the agency owner can read their leads
DROP POLICY IF EXISTS "leads_select_agency" ON public.leads;
CREATE POLICY "leads_select_agency"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND a.owner_id = auth.uid()
    )
  );

-- Only the agency owner can update their leads
DROP POLICY IF EXISTS "leads_update_agency" ON public.leads;
CREATE POLICY "leads_update_agency"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND a.owner_id = auth.uid()
    )
  );

-- Only the agency owner can delete their leads
DROP POLICY IF EXISTS "leads_delete_agency" ON public.leads;
CREATE POLICY "leads_delete_agency"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND a.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Row Level Security — Interactions
-- ---------------------------------------------------------------------------

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert interactions (anonymous tracking)
DROP POLICY IF EXISTS "interactions_insert_public" ON public.interactions;
CREATE POLICY "interactions_insert_public"
  ON public.interactions FOR INSERT
  WITH CHECK (true);

-- Only the agency owner can read their interactions
DROP POLICY IF EXISTS "interactions_select_agency" ON public.interactions;
CREATE POLICY "interactions_select_agency"
  ON public.interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND a.owner_id = auth.uid()
    )
  );
