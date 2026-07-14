-- =============================================================================
-- Immo DZ - Phase 0C / 006: RLS and least-privilege table access
--
-- Replaces only Immo DZ's named policies. Safe to run repeatedly and does not
-- modify business rows.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Remove the permissive Phase 0A policies and any previous Phase 0C versions.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS agencies_select_public ON public.agencies;
DROP POLICY IF EXISTS agencies_insert_owner ON public.agencies;
DROP POLICY IF EXISTS agencies_update_owner ON public.agencies;
DROP POLICY IF EXISTS agencies_delete_owner ON public.agencies;
DROP POLICY IF EXISTS properties_select_public ON public.properties;
DROP POLICY IF EXISTS properties_select_anon ON public.properties;
DROP POLICY IF EXISTS properties_select_authenticated ON public.properties;
DROP POLICY IF EXISTS properties_insert_owner ON public.properties;
DROP POLICY IF EXISTS properties_update_owner ON public.properties;
DROP POLICY IF EXISTS properties_delete_owner ON public.properties;
DROP POLICY IF EXISTS property_images_select_public ON public.property_images;
DROP POLICY IF EXISTS property_images_select_anon ON public.property_images;
DROP POLICY IF EXISTS property_images_select_authenticated ON public.property_images;
DROP POLICY IF EXISTS property_images_write_owner ON public.property_images;
DROP POLICY IF EXISTS property_images_insert_owner ON public.property_images;
DROP POLICY IF EXISTS property_images_delete_owner ON public.property_images;
DROP POLICY IF EXISTS leads_insert_public ON public.leads;
DROP POLICY IF EXISTS leads_select_agency ON public.leads;
DROP POLICY IF EXISTS leads_update_agency ON public.leads;
DROP POLICY IF EXISTS leads_delete_agency ON public.leads;
DROP POLICY IF EXISTS interactions_insert_public ON public.interactions;
DROP POLICY IF EXISTS interactions_select_agency ON public.interactions;

-- Profiles: a user sees only their own profile. Any agency reference must point
-- to an agency actually owned by that authenticated user.
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (agency_id IS NULL OR public.current_user_owns_agency(agency_id))
);

-- Agency contact/profile information remains public by product design. Writes
-- remain owner-only; column grants below further narrow mutable fields.
CREATE POLICY agencies_select_public
ON public.agencies FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY agencies_update_owner
ON public.agencies FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Anonymous visitors can only see active published properties. An authenticated
-- owner additionally sees every state of their own properties.
CREATE POLICY properties_select_anon
ON public.properties FOR SELECT TO anon
USING (is_published = true AND archived_at IS NULL);

CREATE POLICY properties_select_authenticated
ON public.properties FOR SELECT TO authenticated
USING (
  (is_published = true AND archived_at IS NULL)
  OR public.current_user_owns_agency(agency_id)
);

CREATE POLICY properties_insert_owner
ON public.properties FOR INSERT TO authenticated
WITH CHECK (public.current_user_owns_agency(agency_id));

CREATE POLICY properties_update_owner
ON public.properties FOR UPDATE TO authenticated
USING (public.current_user_owns_property(id))
WITH CHECK (public.current_user_owns_agency(agency_id));

CREATE POLICY properties_delete_owner
ON public.properties FOR DELETE TO authenticated
USING (public.current_user_owns_property(id));

-- Image rows follow their parent property's visibility. The Storage bucket is
-- intentionally still public for the MVP; migration 007 hardens object writes.
CREATE POLICY property_images_select_anon
ON public.property_images FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = property_id
      AND property.is_published = true
      AND property.archived_at IS NULL
  )
);

CREATE POLICY property_images_select_authenticated
ON public.property_images FOR SELECT TO authenticated
USING (
  public.current_user_owns_property(property_id)
  OR EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = property_id
      AND property.is_published = true
      AND property.archived_at IS NULL
  )
);

CREATE POLICY property_images_insert_owner
ON public.property_images FOR INSERT TO authenticated
WITH CHECK (public.current_user_owns_property(property_id));

CREATE POLICY property_images_delete_owner
ON public.property_images FOR DELETE TO authenticated
USING (public.current_user_owns_property(property_id));

-- Public lead creation is limited to the exact agency of an active published
-- property. Callers cannot create pre-processed leads or inject CRM notes.
CREATE POLICY leads_insert_public
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  property_id IS NOT NULL
  AND public.is_public_property_for_agency(property_id, agency_id)
  AND status = 'new'
  AND notes IS NULL
);

CREATE POLICY leads_select_agency
ON public.leads FOR SELECT TO authenticated
USING (public.current_user_owns_agency(agency_id));

CREATE POLICY leads_update_agency
ON public.leads FOR UPDATE TO authenticated
USING (public.current_user_owns_agency(agency_id))
WITH CHECK (public.current_user_owns_agency(agency_id));

CREATE POLICY leads_delete_agency
ON public.leads FOR DELETE TO authenticated
USING (public.current_user_owns_agency(agency_id));

-- Interaction events are a separate analytics domain. Public callers may only
-- store an allowed event against the property's real agency; metadata stays an
-- empty object to avoid accepting unnecessary personal tracking data.
CREATE POLICY interactions_insert_public
ON public.interactions FOR INSERT TO anon, authenticated
WITH CHECK (
  public.is_public_property_for_agency(property_id, agency_id)
  AND metadata = '{}'::jsonb
);

CREATE POLICY interactions_select_agency
ON public.interactions FOR SELECT TO authenticated
USING (public.current_user_owns_agency(agency_id));

-- -----------------------------------------------------------------------------
-- Least-privilege grants. RLS controls rows; these grants prevent direct REST
-- callers from mass-assigning ownership, counters, timestamps, and cover state.
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.agencies,
  public.properties,
  public.property_images,
  public.leads,
  public.interactions
FROM anon, authenticated;

GRANT SELECT (id, name, wilaya, address, phone, about, created_at)
  ON public.agencies TO anon;
GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.property_images TO anon;
GRANT INSERT (id, agency_id, property_id, type, name, phone, email, message, source)
  ON public.leads TO anon;
GRANT INSERT (property_id, agency_id, event)
  ON public.interactions TO anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

GRANT SELECT ON public.agencies TO authenticated;
GRANT UPDATE (name, wilaya, address, phone, about)
  ON public.agencies TO authenticated;

GRANT SELECT ON public.properties TO authenticated;
GRANT INSERT (
  agency_id, title, price, transaction, type, wilaya, municipality, address,
  rooms, area, floor, bathrooms, description, status, latitude, longitude,
  slug, is_published, amenities, nearby_places, features, energy_class,
  construction_year, parking_spots, virtual_tour_url, video_url, title_fr,
  description_fr
) ON public.properties TO authenticated;
GRANT UPDATE (
  title, price, transaction, type, wilaya, municipality, address, rooms, area,
  floor, bathrooms, description, status, latitude, longitude, is_published,
  archived_at, amenities, nearby_places, features, energy_class,
  construction_year, parking_spots, virtual_tour_url, video_url, title_fr,
  description_fr
) ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;

GRANT SELECT ON public.property_images TO authenticated;
GRANT INSERT (property_id, url, thumbnail_url, "order")
  ON public.property_images TO authenticated;
GRANT DELETE ON public.property_images TO authenticated;

GRANT SELECT ON public.leads TO authenticated;
GRANT INSERT (id, agency_id, property_id, type, name, phone, email, message, source)
  ON public.leads TO authenticated;
GRANT UPDATE (status, notes) ON public.leads TO authenticated;
GRANT DELETE ON public.leads TO authenticated;

GRANT SELECT ON public.interactions TO authenticated;
GRANT INSERT (property_id, agency_id, event)
  ON public.interactions TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
