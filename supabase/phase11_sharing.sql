-- =============================================================================
-- Immo DZ — Phase 11: Property Sharing Analytics
-- Run this in the Supabase SQL editor AFTER phase10_leads.sql.
-- =============================================================================

-- 1. Update the interactions table event constraint to support sharing events
ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_event_check;

ALTER TABLE public.interactions ADD CONSTRAINT interactions_event_check CHECK (
  event IN (
    'phone_click', 
    'whatsapp_click', 
    'share', 
    'favorite', 
    'property_view',
    'copy_link', 
    'native_share', 
    'whatsapp_share', 
    'facebook_share', 
    'telegram_share', 
    'email_share', 
    'qr_code_opened', 
    'qr_code_downloaded'
  )
);
