-- =============================================================================
-- Immo DZ — Phase 5: properties + property_images
-- Run this in the Supabase SQL editor. Idempotent (safe to re-run).
-- Requires Phase 4 schema (agencies, profiles) to already exist.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies (id) on delete cascade,
  title        text not null,
  price        numeric not null default 0,
  transaction  text not null default 'sale'
                 check (transaction in ('sale', 'rent')),
  type         text not null default 'apartment'
                 check (type in ('apartment', 'villa', 'commercial', 'land')),
  wilaya       text,
  municipality text,
  address      text,
  rooms        integer not null default 0,
  area         numeric not null default 0,
  floor        integer not null default 0,
  bathrooms    integer not null default 0,
  description  text,
  status       text not null default 'available'
                 check (status in ('available', 'reserved', 'sold', 'rented')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.property_images (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  url         text not null,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists properties_agency_id_idx on public.properties (agency_id);
create index if not exists properties_wilaya_idx    on public.properties (wilaya);
create index if not exists properties_status_idx    on public.properties (status);
create index if not exists property_images_property_id_idx
  on public.property_images (property_id);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on every UPDATE.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.property_images enable row level security;

-- properties: anyone can read; only the owning agency can write.
drop policy if exists "properties_select_public" on public.properties;
create policy "properties_select_public"
  on public.properties for select
  using (true);

drop policy if exists "properties_insert_owner" on public.properties;
create policy "properties_insert_owner"
  on public.properties for insert
  with check (
    exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists "properties_update_owner" on public.properties;
create policy "properties_update_owner"
  on public.properties for update
  using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists "properties_delete_owner" on public.properties;
create policy "properties_delete_owner"
  on public.properties for delete
  using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    )
  );

-- property_images: anyone can read; only the owner of the parent property writes.
drop policy if exists "property_images_select_public" on public.property_images;
create policy "property_images_select_public"
  on public.property_images for select
  using (true);

drop policy if exists "property_images_write_owner" on public.property_images;
create policy "property_images_write_owner"
  on public.property_images for all
  using (
    exists (
      select 1
      from public.properties p
      join public.agencies a on a.id = p.agency_id
      where p.id = property_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.properties p
      join public.agencies a on a.id = p.agency_id
      where p.id = property_id and a.owner_id = auth.uid()
    )
  );
