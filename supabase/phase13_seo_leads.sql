-- =============================================================================
-- Immo DZ — Phase 13: SEO & Lead Attribution Tracking
-- Purpose: Adds tracking of the acquisition source to the leads CRM.
-- Safe to run multiple times (Idempotent).
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'unknown';

-- Restrict to known SEO / Social sources
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check CHECK (
  source IN (
    'google', 
    'whatsapp', 
    'facebook', 
    'instagram', 
    'telegram', 
    'direct', 
    'referral', 
    'unknown'
  )
);

-- Force cache reload for PostgREST
NOTIFY pgrst, 'reload schema';
