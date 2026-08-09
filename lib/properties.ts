import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isUuid } from "@/lib/lead-validation";
import type {
  Agency,
  AgencyLite,
  EnergyClass,
  Property,
  PropertyFilters,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  TransactionType,
} from "@/lib/types";

/** Columns selected for a property, including embedded agency + photos. */
const PROPERTY_SELECT = `
  id, agency_id, title, price, transaction, type, wilaya, municipality, address,
  rooms, area, floor, bathrooms, description, status, latitude, longitude, created_at,
  slug, is_published, archived_at,
  amenities, nearby_places, features, energy_class, construction_year, parking_spots,
  virtual_tour_url, video_url,
  title_fr, description_fr,
  views_count, contacts_count,
  agency:agencies ( id, name, wilaya, phone ),
  images:property_images ( id, url, thumbnail_url, is_cover, created_at, "order" )
`;

type PropertyRow = {
  id: string;
  agency_id: string;
  title: string;
  price: number | string;
  transaction: TransactionType;
  type: PropertyType;
  wilaya: string | null;
  municipality: string | null;
  address: string | null;
  rooms: number | null;
  area: number | string | null;
  floor: number | null;
  bathrooms: number | null;
  description: string | null;
  status: PropertyStatus;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string;
  /* Phase 9 */
  slug: string | null;
  is_published: boolean;
  archived_at: string | null;
  amenities: string[] | null;
  nearby_places: string[] | null;
  features: string[] | null;
  energy_class: EnergyClass | null;
  construction_year: number | null;
  parking_spots: number | null;
  virtual_tour_url: string | null;
  video_url: string | null;
  title_fr: string | null;
  description_fr: string | null;
  views_count: number | null;
  contacts_count: number | null;
  agency:
    | { id: string; name: string; wilaya: string | null; phone: string | null }
    | null;
  images: {
    id: string;
    url: string;
    thumbnail_url: string | null;
    is_cover: boolean;
    created_at: string;
    order: number;
  }[] | null;
};

function requirePropertyService(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("خدمة العقارات غير متوفرة حالياً.");
  }
}

function throwPropertyQueryError(
  operation: string,
  error: unknown,
  context?: Record<string, string>,
): never {
  const errorRecord =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;
  const causeRecord =
    typeof errorRecord?.cause === "object" && errorRecord.cause !== null
      ? (errorRecord.cause as Record<string, unknown>)
      : null;

  console.error(`[properties:${operation}]`, {
    ...context,
    name: typeof errorRecord?.name === "string" ? errorRecord.name : null,
    code: typeof errorRecord?.code === "string" ? errorRecord.code : null,
    message:
      typeof errorRecord?.message === "string" ? errorRecord.message : null,
    details:
      typeof errorRecord?.details === "string" ? errorRecord.details : null,
    hint: typeof errorRecord?.hint === "string" ? errorRecord.hint : null,
    status: typeof errorRecord?.status === "number" ? errorRecord.status : null,
    statusText:
      typeof errorRecord?.statusText === "string"
        ? errorRecord.statusText
        : null,
    cause: causeRecord
      ? {
          name:
            typeof causeRecord.name === "string" ? causeRecord.name : null,
          code:
            typeof causeRecord.code === "string" ? causeRecord.code : null,
          message:
            typeof causeRecord.message === "string"
              ? causeRecord.message
              : null,
        }
      : null,
  });
  throw new Error("تعذّر تحميل بيانات العقارات.");
}

function mapProperty(row: PropertyRow): Property {
  const photos: PropertyImage[] = (row.images ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.is_cover) - Number(a.is_cover) ||
        a.order - b.order ||
        a.created_at.localeCompare(b.created_at),
    )
    .map((img) => ({
      id: img.id,
      url: img.url,
      thumbnailUrl: img.thumbnail_url,
      isCover: img.is_cover,
    }));

  return {
    id: row.id,
    agencyId: row.agency_id,
    title: row.title,
    price: Number(row.price ?? 0),
    transaction: row.transaction,
    type: row.type,
    wilaya: row.wilaya ?? "",
    municipality: row.municipality ?? "",
    address: row.address ?? "",
    rooms: row.rooms ?? 0,
    area: Number(row.area ?? 0),
    floor: row.floor ?? 0,
    bathrooms: row.bathrooms ?? 0,
    description: row.description ?? "",
    status: row.status,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    photos,
    images: photos.length,
    createdAt: row.created_at,
    agency: row.agency
      ? {
          id: row.agency.id,
          name: row.agency.name,
          wilaya: row.agency.wilaya ?? "",
          phone: row.agency.phone,
        }
      : undefined,
    /* Phase 9 */
    slug: row.slug,
    isPublished: row.is_published,
    archivedAt: row.archived_at,
    amenities: row.amenities ?? [],
    nearbyPlaces: row.nearby_places ?? [],
    features: row.features ?? [],
    energyClass: row.energy_class,
    constructionYear: row.construction_year,
    parkingSpots: row.parking_spots ?? 0,
    virtualTourUrl: row.virtual_tour_url,
    videoUrl: row.video_url,
    titleFr: row.title_fr,
    descriptionFr: row.description_fr,
    viewsCount: row.views_count ?? 0,
    contactsCount: row.contacts_count ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Current agency (dashboard)                                                */
/* -------------------------------------------------------------------------- */

/** The agency id owned by / linked to the signed-in user, or null. */
export async function getCurrentAgencyId(): Promise<string | null> {
  requirePropertyService();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throwPropertyQueryError("current-user", authError);
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throwPropertyQueryError("current-agency", error, { userId: user.id });
  }

  if (!data?.agency_id) return null;

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", data.agency_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (agencyError) {
    throwPropertyQueryError("current-agency-owner", agencyError, {
      userId: user.id,
    });
  }

  return agency?.id ?? null;
}

export async function listPropertiesForAgency(
  agencyId: string,
): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("agency_id", agencyId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throwPropertyQueryError("agency-list", error, { agencyId });

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/** Archived properties for the agency. */
export async function listArchivedProperties(
  agencyId: string,
): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("agency_id", agencyId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) throwPropertyQueryError("agency-archive", error, { agencyId });

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/* -------------------------------------------------------------------------- */
/*  Single property                                                           */
/* -------------------------------------------------------------------------- */

export async function getPropertyById(id: string): Promise<Property | null> {
  if (!isUuid(id)) return null;
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throwPropertyQueryError("detail-by-id", error, { propertyId: id });

  return data ? mapProperty(data as unknown as PropertyRow) : null;
}

/** Lookup by slug — used for SEO-friendly public URLs. */
export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throwPropertyQueryError("detail-by-slug", error, { slug });

  return data ? mapProperty(data as unknown as PropertyRow) : null;
}

/** Public lookup that never returns drafts or archived properties. */
export async function getPublishedPropertyByIdentifier(
  identifier: string,
): Promise<Property | null> {
  requirePropertyService();
  const supabase = await createClient();
  const field = isUuid(identifier) ? "id" : "slug";
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq(field, identifier)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throwPropertyQueryError("public-detail", error, { identifier });
  }
  return data ? mapProperty(data as unknown as PropertyRow) : null;
}

/** Newest properties across all agencies, for the landing page. */
export async function getLatestProperties(limit = 4): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throwPropertyQueryError("latest", error);

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/* -------------------------------------------------------------------------- */
/*  Public search                                                             */
/* -------------------------------------------------------------------------- */

export async function searchProperties(
  filters: PropertyFilters,
): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("is_published", true)
    .is("archived_at", null);

  if (filters.wilaya) query = query.eq("wilaya", filters.wilaya);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.transaction) query = query.eq("transaction", filters.transaction);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.rooms != null) query = query.gte("rooms", filters.rooms);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throwPropertyQueryError("search", error);
  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/** All available properties, for the full map at /carte. */
export async function getAvailableProperties(): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("status", "available")
    .eq("is_published", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throwPropertyQueryError("map", error);

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/** Same type or same wilaya, excluding the given property. */
export async function getSimilarProperties(
  property: Property,
  limit = 3,
): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .neq("id", property.id)
    .eq("is_published", true)
    .is("archived_at", null)
    .or(`type.eq.${property.type},wilaya.eq.${property.wilaya}`)
    .limit(limit);

  if (error) {
    throwPropertyQueryError("similar", error, { propertyId: property.id });
  }

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/* -------------------------------------------------------------------------- */
/*  Statistics                                                                */
/* -------------------------------------------------------------------------- */

/** Increment the view counter atomically without affecting page rendering. */
export async function incrementViewCount(propertyId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.error("[properties:increment-view] Supabase is not configured.");
    return false;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_property_views", {
    property_id: propertyId,
  });
  if (error) {
    console.error("[properties:increment-view]", {
      propertyId,
      code: error.code ?? "unexpected",
    });
    return false;
  }
  return true;
}

/** Aggregate stats for an agency's properties. */
export async function getPropertyStats(agencyId: string): Promise<{
  total: number;
  published: number;
  drafts: number;
  archived: number;
  totalViews: number;
  totalContacts: number;
}> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("is_published, archived_at, views_count, contacts_count")
    .eq("agency_id", agencyId);

  if (error) throwPropertyQueryError("stats", error, { agencyId });

  const rows = data ?? [];
  let published = 0, drafts = 0, archived = 0, totalViews = 0, totalContacts = 0;
  for (const r of rows) {
    const row = r as { is_published: boolean; archived_at: string | null; views_count: number; contacts_count: number };
    totalViews += row.views_count ?? 0;
    totalContacts += row.contacts_count ?? 0;
    if (row.archived_at) { archived++; continue; }
    if (row.is_published) published++; else drafts++;
  }

  return { total: rows.length, published, drafts, archived, totalViews, totalContacts };
}

/* -------------------------------------------------------------------------- */
/*  Agencies                                                                  */
/* -------------------------------------------------------------------------- */

export async function getAgencyById(id: string): Promise<Agency | null> {
  if (!isUuid(id)) return null;
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, wilaya, address, phone, about")
    .eq("id", id)
    .maybeSingle();

  if (error) throwPropertyQueryError("agency-detail", error, { agencyId: id });

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    wilaya: data.wilaya ?? "",
    address: data.address ?? "",
    phone: data.phone,
    about: data.about,
  };
}

export async function getPropertiesByAgency(
  agencyId: string,
): Promise<Property[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("agency_id", agencyId)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throwPropertyQueryError("agency-properties", error, { agencyId });

  return (data as unknown as PropertyRow[] | null)?.map(mapProperty) ?? [];
}

/** All agencies (for navbar dropdown + footer links). */
export async function listAgencies(limit = 12): Promise<AgencyLite[]> {
  requirePropertyService();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, wilaya, phone")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throwPropertyQueryError("agencies", error);

  return (
    (data as
      | { id: string; name: string; wilaya: string | null; phone: string | null }[]
      | null)?.map((a) => ({
      id: a.id,
      name: a.name,
      wilaya: a.wilaya ?? "",
      phone: a.phone,
    })) ?? []
  );
}
