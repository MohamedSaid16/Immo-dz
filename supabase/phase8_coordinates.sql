-- =============================================================================
-- Immo DZ — Phase 8: property map coordinates
-- Run this in the Supabase SQL editor. Idempotent (safe to re-run).
-- =============================================================================

alter table public.properties
  add column if not exists latitude  numeric,
  add column if not exists longitude numeric;
