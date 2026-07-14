-- =============================================================================
-- Immo DZ — Phase 4 auth schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.agencies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  wilaya     text,
  address    text,
  phone      text,
  owner_id   uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  agency_id  uuid references public.agencies (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agencies_owner_id_idx on public.agencies (owner_id);
create index if not exists profiles_agency_id_idx on public.profiles (agency_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- Runs as SECURITY DEFINER so it can bypass RLS.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;

-- profiles: a user can see and edit only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- agencies: publicly readable (for the public buyer pages), but only the owner
-- can create / edit / delete their agency.
drop policy if exists "agencies_select_public" on public.agencies;
create policy "agencies_select_public"
  on public.agencies for select
  using (true);

drop policy if exists "agencies_insert_owner" on public.agencies;
create policy "agencies_insert_owner"
  on public.agencies for insert
  with check (auth.uid() = owner_id);

drop policy if exists "agencies_update_owner" on public.agencies;
create policy "agencies_update_owner"
  on public.agencies for update
  using (auth.uid() = owner_id);

drop policy if exists "agencies_delete_owner" on public.agencies;
create policy "agencies_delete_owner"
  on public.agencies for delete
  using (auth.uid() = owner_id);

-- =============================================================================
-- Phase 5 — properties + property_images
-- (Also available standalone in supabase/phase5_properties.sql)
-- =============================================================================

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
  latitude     numeric,
  longitude    numeric,
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

alter table public.properties enable row level security;
alter table public.property_images enable row level security;

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
