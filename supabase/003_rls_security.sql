-- =============================================================================
-- Immo DZ - Phase 0A / 003: baseline RLS and table privileges
--
-- Safe to run more than once. Existing named policies are left untouched.
-- Phase 0C will narrow anonymous draft/image reads and validate public lead and
-- interaction relationships; this migration preserves the current application.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DO $migration$
BEGIN
  -- Profiles: the authenticated user can manage only their own profile.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_select_own
      ON public.profiles FOR SELECT TO authenticated
      USING (auth.uid() = id)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_insert_own
      ON public.profiles FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_update_own
      ON public.profiles FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    $policy$;
  END IF;

  -- Agencies remain publicly readable for public agency/property pages.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agencies'
      AND policyname = 'agencies_select_public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agencies_select_public
      ON public.agencies FOR SELECT
      USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agencies'
      AND policyname = 'agencies_insert_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agencies_insert_owner
      ON public.agencies FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = owner_id)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agencies'
      AND policyname = 'agencies_update_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agencies_update_owner
      ON public.agencies FOR UPDATE TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agencies'
      AND policyname = 'agencies_delete_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agencies_delete_owner
      ON public.agencies FOR DELETE TO authenticated
      USING (auth.uid() = owner_id)
    $policy$;
  END IF;

  -- Public filtering is performed by existing public queries in Phase 0A.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'properties_select_public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY properties_select_public
      ON public.properties FOR SELECT
      USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'properties_insert_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY properties_insert_owner
      ON public.properties FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'properties_update_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY properties_update_owner
      ON public.properties FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'properties_delete_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY properties_delete_owner
      ON public.properties FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  -- Image reads stay public in 0A; writes follow parent property ownership.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_images'
      AND policyname = 'property_images_select_public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_images_select_public
      ON public.property_images FOR SELECT
      USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_images'
      AND policyname = 'property_images_write_owner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY property_images_write_owner
      ON public.property_images FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.properties AS property
          JOIN public.agencies AS agency ON agency.id = property.agency_id
          WHERE property.id = property_id
            AND agency.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.properties AS property
          JOIN public.agencies AS agency ON agency.id = property.agency_id
          WHERE property.id = property_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  -- Public visitors can create leads/interactions. Agency members can read and
  -- manage records assigned to their agency. Relationship hardening is Phase 0C.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'leads_insert_public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY leads_insert_public
      ON public.leads FOR INSERT
      WITH CHECK (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'leads_select_agency'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY leads_select_agency
      ON public.leads FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'leads_update_agency'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY leads_update_agency
      ON public.leads FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'leads_delete_agency'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY leads_delete_agency
      ON public.leads FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interactions'
      AND policyname = 'interactions_insert_public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY interactions_insert_public
      ON public.interactions FOR INSERT
      WITH CHECK (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interactions'
      AND policyname = 'interactions_select_agency'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY interactions_select_agency
      ON public.interactions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agencies AS agency
          WHERE agency.id = agency_id
            AND agency.owner_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$migration$;

-- Explicit table grants keep fresh installations functional without relying on
-- dashboard-specific default privileges. RLS remains the row-level authority.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE
  public.agencies,
  public.properties,
  public.property_images
TO anon;

GRANT INSERT ON TABLE
  public.leads,
  public.interactions
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.agencies,
  public.properties,
  public.property_images,
  public.leads,
  public.interactions
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
