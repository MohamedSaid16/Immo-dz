-- =============================================================================
-- Immo DZ - Phase 0A / 001: additive schema synchronization
--
-- Safe to run more than once. This migration creates only missing tables,
-- columns, constraints, and indexes. It never deletes rows and never changes
-- a property's publication state from draft to published.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agencies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  wilaya     text,
  address    text,
  phone      text,
  owner_id   uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  about      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      text,
  full_name  text,
  phone      text,
  agency_id  uuid REFERENCES public.agencies (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  title             text NOT NULL,
  price             numeric NOT NULL DEFAULT 0,
  transaction       text NOT NULL DEFAULT 'sale',
  type              text NOT NULL DEFAULT 'apartment',
  wilaya            text,
  municipality      text,
  address           text,
  rooms             integer NOT NULL DEFAULT 0,
  area              numeric NOT NULL DEFAULT 0,
  floor             integer NOT NULL DEFAULT 0,
  bathrooms         integer NOT NULL DEFAULT 0,
  description       text,
  status            text NOT NULL DEFAULT 'available',
  latitude          numeric,
  longitude         numeric,
  slug              text,
  is_published      boolean NOT NULL DEFAULT false,
  archived_at       timestamptz,
  amenities         text[] NOT NULL DEFAULT '{}',
  nearby_places     text[] NOT NULL DEFAULT '{}',
  features          text[] NOT NULL DEFAULT '{}',
  energy_class      text,
  construction_year integer,
  parking_spots     integer NOT NULL DEFAULT 0,
  virtual_tour_url  text,
  video_url         text,
  title_fr          text,
  description_fr    text,
  views_count       integer NOT NULL DEFAULT 0,
  contacts_count    integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  url           text NOT NULL,
  thumbnail_url text,
  is_cover      boolean NOT NULL DEFAULT false,
  "order"       integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties (id) ON DELETE SET NULL,
  type        text NOT NULL DEFAULT 'info',
  status      text NOT NULL DEFAULT 'new',
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text,
  message     text,
  notes       text,
  source      text NOT NULL DEFAULT 'unknown',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  event       text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Missing columns from older installations
-- -----------------------------------------------------------------------------

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS about text;

ALTER TABLE public.property_images
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nearby_places text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_class text,
  ADD COLUMN IF NOT EXISTS construction_year integer,
  ADD COLUMN IF NOT EXISTS parking_spots integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_tour_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS title_fr text,
  ADD COLUMN IF NOT EXISTS description_fr text,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contacts_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'unknown';

-- Normalize only missing/invalid metadata. No business row is removed.
UPDATE public.leads
SET source = 'unknown'
WHERE source IS NULL
   OR source NOT IN (
     'google', 'whatsapp', 'facebook', 'instagram',
     'telegram', 'direct', 'referral', 'unknown'
   );

ALTER TABLE public.leads
  ALTER COLUMN source SET DEFAULT 'unknown',
  ALTER COLUMN source SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Foreign keys. Existing equivalent keys are detected by their referenced
-- table and column, not by a project-specific constraint name.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.agencies'::regclass
      AND constraint_record.confrelid = 'auth.users'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'owner_id'
  ) THEN
    ALTER TABLE public.agencies
      ADD CONSTRAINT agencies_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.profiles'::regclass
      AND constraint_record.confrelid = 'auth.users'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'id'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.profiles'::regclass
      AND constraint_record.confrelid = 'public.agencies'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'agency_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies (id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.properties'::regclass
      AND constraint_record.confrelid = 'public.agencies'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'agency_id'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.property_images'::regclass
      AND constraint_record.confrelid = 'public.properties'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'property_id'
  ) THEN
    ALTER TABLE public.property_images
      ADD CONSTRAINT property_images_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.leads'::regclass
      AND constraint_record.confrelid = 'public.agencies'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'agency_id'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.leads'::regclass
      AND constraint_record.confrelid = 'public.properties'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'property_id'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.interactions'::regclass
      AND constraint_record.confrelid = 'public.properties'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'property_id'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    JOIN pg_attribute AS local_column
      ON local_column.attrelid = constraint_record.conrelid
     AND local_column.attnum = ANY (constraint_record.conkey)
    WHERE constraint_record.conrelid = 'public.interactions'::regclass
      AND constraint_record.confrelid = 'public.agencies'::regclass
      AND constraint_record.contype = 'f'
      AND cardinality(constraint_record.conkey) = 1
      AND local_column.attname = 'agency_id'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies (id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Domain constraints. NOT VALID preserves legacy data while protecting all
-- new writes. Earlier named constraints are changed only when their definition
-- is missing values required by the current application.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_transaction_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_transaction_check
      CHECK (transaction IN ('sale', 'rent')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_type_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_type_check
      CHECK (type IN ('apartment', 'villa', 'commercial', 'land')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_status_check
      CHECK (status IN ('available', 'reserved', 'sold', 'rented')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_energy_class_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_energy_class_check
      CHECK (energy_class IS NULL OR energy_class IN ('A','B','C','D','E','F','G'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_construction_year_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_construction_year_check
      CHECK (construction_year IS NULL OR construction_year BETWEEN 1900 AND 2100)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_type_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_type_check
      CHECK (type IN ('info', 'visit', 'reservation')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_status_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN (
        'new', 'contacted', 'visit_scheduled', 'visited',
        'negotiating', 'converted', 'lost'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_source_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_source_check
      CHECK (source IN (
        'google', 'whatsapp', 'facebook', 'instagram',
        'telegram', 'direct', 'referral', 'unknown'
      )) NOT VALID;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_source_check'
      AND pg_get_constraintdef(oid) ILIKE '%telegram%'
      AND pg_get_constraintdef(oid) ILIKE '%referral%'
      AND pg_get_constraintdef(oid) ILIKE '%unknown%'
  ) THEN
    ALTER TABLE public.leads DROP CONSTRAINT leads_source_check;
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_source_check
      CHECK (source IN (
        'google', 'whatsapp', 'facebook', 'instagram',
        'telegram', 'direct', 'referral', 'unknown'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.interactions'::regclass
      AND conname = 'interactions_event_check'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_event_check
      CHECK (event IN (
        'phone_click', 'whatsapp_click', 'share', 'favorite', 'property_view',
        'copy_link', 'native_share', 'whatsapp_share', 'facebook_share',
        'telegram_share', 'email_share', 'qr_code_opened', 'qr_code_downloaded'
      )) NOT VALID;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.interactions'::regclass
      AND conname = 'interactions_event_check'
      AND pg_get_constraintdef(oid) ILIKE '%copy_link%'
      AND pg_get_constraintdef(oid) ILIKE '%native_share%'
      AND pg_get_constraintdef(oid) ILIKE '%qr_code_downloaded%'
  ) THEN
    ALTER TABLE public.interactions DROP CONSTRAINT interactions_event_check;
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_event_check
      CHECK (event IN (
        'phone_click', 'whatsapp_click', 'share', 'favorite', 'property_view',
        'copy_link', 'native_share', 'whatsapp_share', 'facebook_share',
        'telegram_share', 'email_share', 'qr_code_opened', 'qr_code_downloaded'
      )) NOT VALID;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Cover normalization. This block is a no-op once every property with images
-- has exactly one cover.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT property_id
    FROM public.property_images
    GROUP BY property_id
    HAVING count(*) FILTER (WHERE is_cover) <> 1
  ) THEN
    WITH ranked AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY property_id
          ORDER BY is_cover DESC, "order" ASC, created_at ASC, id ASC
        ) AS position
      FROM public.property_images
    )
    UPDATE public.property_images AS image
    SET is_cover = (ranked.position = 1)
    FROM ranked
    WHERE image.id = ranked.id
      AND image.is_cover IS DISTINCT FROM (ranked.position = 1);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Indexes used by the current application queries
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS agencies_owner_id_idx
  ON public.agencies (owner_id);

CREATE INDEX IF NOT EXISTS profiles_agency_id_idx
  ON public.profiles (agency_id);

CREATE INDEX IF NOT EXISTS properties_agency_id_idx
  ON public.properties (agency_id);

CREATE INDEX IF NOT EXISTS properties_wilaya_idx
  ON public.properties (wilaya);

CREATE INDEX IF NOT EXISTS properties_status_idx
  ON public.properties (status);

CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_idx
  ON public.properties (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS properties_public_listing_idx
  ON public.properties (created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS properties_agency_active_idx
  ON public.properties (agency_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS properties_agency_archived_idx
  ON public.properties (agency_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_images_property_id_idx
  ON public.property_images (property_id);

CREATE INDEX IF NOT EXISTS property_images_ordered_idx
  ON public.property_images (property_id, "order", created_at, id);

CREATE UNIQUE INDEX IF NOT EXISTS property_images_one_cover_idx
  ON public.property_images (property_id)
  WHERE is_cover = true;

CREATE INDEX IF NOT EXISTS leads_agency_id_idx
  ON public.leads (agency_id);

CREATE INDEX IF NOT EXISTS leads_property_id_idx
  ON public.leads (property_id);

CREATE INDEX IF NOT EXISTS leads_status_idx
  ON public.leads (status);

CREATE INDEX IF NOT EXISTS leads_created_at_idx
  ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS leads_agency_created_at_idx
  ON public.leads (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS interactions_property_id_idx
  ON public.interactions (property_id);

CREATE INDEX IF NOT EXISTS interactions_agency_id_idx
  ON public.interactions (agency_id);

CREATE INDEX IF NOT EXISTS interactions_event_idx
  ON public.interactions (event);

NOTIFY pgrst, 'reload schema';

COMMIT;
