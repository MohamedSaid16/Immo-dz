"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { validatePropertyForm } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type PropertyFormState = { error?: string } | undefined;
export type PropertyActionResult = { error?: string };

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DUPLICATE_SELECT = `
  title, price, transaction, type, wilaya, municipality, address,
  rooms, area, floor, bathrooms, description, status, latitude, longitude,
  amenities, nearby_places, features, energy_class, construction_year,
  parking_spots, virtual_tour_url, video_url, title_fr, description_fr
`;

function revalidateAll() {
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard");
  revalidatePath("/biens");
  revalidatePath("/carte");
}

function validPropertyId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

function databaseErrorMessage(operation: string, code?: string): string {
  if (code === "PGRST204" || code === "PGRST202" || code === "42703") {
    return "تعذر إكمال العملية لأن قاعدة البيانات غير محدثة. طبّق هجرات Phase 0A ثم أعد المحاولة.";
  }

  if (code === "23505") {
    return "توجد بيانات متعارضة مع عقار آخر. يرجى إعادة المحاولة.";
  }

  return `تعذر ${operation}. يرجى المحاولة مرة أخرى.`;
}

function logDatabaseError(
  operation: string,
  error: { code?: string },
) {
  console.error(`Property ${operation} failed`, {
    code: error.code ?? "unexpected",
  });
}

async function getAgencyId(
  supabase: ServerSupabaseClient,
): Promise<{ agencyId: string | null; error?: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logDatabaseError("authentication", authError);
    return {
      agencyId: null,
      error: "تعذر التحقق من الجلسة. يرجى تسجيل الدخول مجددًا.",
    };
  }
  if (!user) {
    return {
      agencyId: null,
      error: "يجب تسجيل الدخول لإدارة العقارات.",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logDatabaseError("agency lookup", error);
    return {
      agencyId: null,
      error: databaseErrorMessage("تحميل بيانات الوكالة", error.code),
    };
  }
  if (!data?.agency_id) {
    return {
      agencyId: null,
      error: "لا توجد وكالة مرتبطة بحسابك. يرجى إكمال بيانات الوكالة.",
    };
  }

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", data.agency_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (agencyError) {
    logDatabaseError("agency ownership", agencyError);
    return {
      agencyId: null,
      error: databaseErrorMessage("التحقق من ملكية الوكالة", agencyError.code),
    };
  }
  if (!agency) {
    return {
      agencyId: null,
      error: "لا تملك صلاحية إدارة الوكالة المرتبطة بهذا الحساب.",
    };
  }

  return { agencyId: data.agency_id };
}

async function verifyPropertyOwnership(
  supabase: ServerSupabaseClient,
  propertyId: string,
  agencyId: string,
): Promise<PropertyActionResult> {
  if (!validPropertyId(propertyId)) {
    return { error: "معرّف العقار غير صالح." };
  }

  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) {
    logDatabaseError("ownership check", error);
    return { error: databaseErrorMessage("التحقق من ملكية العقار", error.code) };
  }
  if (!data) {
    return { error: "العقار غير موجود أو لا ينتمي إلى وكالتك." };
  }

  return {};
}

function uniqueSlug(title: string): string {
  const base = slugify(title) || "property";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function saveProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const result = validatePropertyForm(formData);
  if (!result.ok) {
    return { error: result.error };
  }

  const { data } = result;
  const supabase = await createClient();
  const agency = await getAgencyId(supabase);

  if (!agency.agencyId) {
    return { error: agency.error };
  }

  const record = {
    title: data.title,
    price: data.price,
    transaction: data.transaction,
    type: data.type,
    wilaya: data.wilaya,
    municipality: data.municipality,
    address: data.address,
    rooms: data.rooms,
    area: data.area,
    floor: data.floor,
    bathrooms: data.bathrooms,
    description: data.description,
    status: data.status,
    latitude: data.latitude,
    longitude: data.longitude,
    title_fr: data.titleFr || null,
    description_fr: data.descriptionFr || null,
    amenities: data.amenities,
    nearby_places: data.nearbyPlaces,
    features: data.features,
    energy_class: data.energyClass,
    construction_year: data.constructionYear,
    parking_spots: data.parkingSpots,
    virtual_tour_url: data.virtualTourUrl,
    video_url: data.videoUrl,
    is_published: data.isPublished,
  };

  let redirectTo = "/dashboard/properties";

  if (data.id) {
    const ownership = await verifyPropertyOwnership(
      supabase,
      data.id,
      agency.agencyId,
    );
    if (ownership.error) {
      return ownership;
    }

    const { data: updated, error } = await supabase
      .from("properties")
      .update(record)
      .eq("id", data.id)
      .eq("agency_id", agency.agencyId)
      .select("id")
      .maybeSingle();

    if (error) {
      logDatabaseError("update", error);
      return { error: databaseErrorMessage("حفظ التعديلات", error.code) };
    }
    if (!updated) {
      return { error: "لم يتم العثور على العقار لتحديثه." };
    }
  } else {
    const { data: created, error } = await supabase
      .from("properties")
      .insert({
        ...record,
        agency_id: agency.agencyId,
        slug: uniqueSlug(data.title),
      })
      .select("id")
      .single();

    if (error) {
      logDatabaseError("create", error);
      return { error: databaseErrorMessage("إضافة العقار", error.code) };
    }
    if (!created) {
      return { error: "تعذر إضافة العقار. يرجى المحاولة مرة أخرى." };
    }

    redirectTo = `/dashboard/properties/${created.id}/edit`;
  }

  revalidateAll();
  redirect(redirectTo);
}

async function updateOwnedProperty(
  id: string,
  values: Record<string, string | boolean | null>,
  operation: string,
): Promise<PropertyActionResult> {
  const supabase = await createClient();
  const agency = await getAgencyId(supabase);

  if (!agency.agencyId) {
    return { error: agency.error };
  }

  const ownership = await verifyPropertyOwnership(
    supabase,
    id,
    agency.agencyId,
  );
  if (ownership.error) {
    return ownership;
  }

  const { data, error } = await supabase
    .from("properties")
    .update(values)
    .eq("id", id)
    .eq("agency_id", agency.agencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError(operation, error);
    return { error: databaseErrorMessage(operation, error.code) };
  }
  if (!data) {
    return { error: "العقار غير موجود أو لا ينتمي إلى وكالتك." };
  }

  revalidateAll();
  return {};
}

export async function deleteProperty(id: string): Promise<PropertyActionResult> {
  const supabase = await createClient();
  const agency = await getAgencyId(supabase);

  if (!agency.agencyId) {
    return { error: agency.error };
  }

  const ownership = await verifyPropertyOwnership(
    supabase,
    id,
    agency.agencyId,
  );
  if (ownership.error) {
    return ownership;
  }

  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("agency_id", agency.agencyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("delete", error);
    return { error: databaseErrorMessage("حذف العقار", error.code) };
  }
  if (!data) {
    return { error: "العقار غير موجود أو لا ينتمي إلى وكالتك." };
  }

  revalidateAll();
  return {};
}

export async function publishProperty(
  id: string,
): Promise<PropertyActionResult> {
  return updateOwnedProperty(
    id,
    { is_published: true },
    "نشر العقار",
  );
}

export async function unpublishProperty(
  id: string,
): Promise<PropertyActionResult> {
  return updateOwnedProperty(
    id,
    { is_published: false },
    "إلغاء نشر العقار",
  );
}

export async function archiveProperty(
  id: string,
): Promise<PropertyActionResult> {
  return updateOwnedProperty(
    id,
    {
      archived_at: new Date().toISOString(),
      is_published: false,
    },
    "أرشفة العقار",
  );
}

export async function restoreProperty(
  id: string,
): Promise<PropertyActionResult> {
  return updateOwnedProperty(id, { archived_at: null }, "استعادة العقار");
}

export async function setPropertyCover(
  propertyId: string,
  imageId: string,
): Promise<PropertyActionResult> {
  if (!validPropertyId(imageId)) {
    return { error: "معرّف الصورة غير صالح." };
  }

  const supabase = await createClient();
  const agency = await getAgencyId(supabase);

  if (!agency.agencyId) {
    return { error: agency.error };
  }

  const ownership = await verifyPropertyOwnership(
    supabase,
    propertyId,
    agency.agencyId,
  );
  if (ownership.error) {
    return ownership;
  }

  const { data: image, error: imageError } = await supabase
    .from("property_images")
    .select("id")
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (imageError) {
    logDatabaseError("cover image lookup", imageError);
    return {
      error: databaseErrorMessage("التحقق من صورة الغلاف", imageError.code),
    };
  }
  if (!image) {
    return { error: "الصورة غير موجودة أو لا تنتمي إلى هذا العقار." };
  }

  const { error } = await supabase.rpc("set_property_cover", {
    target_property_id: propertyId,
    target_image_id: imageId,
  });

  if (error) {
    logDatabaseError("set cover", error);
    return { error: databaseErrorMessage("تعيين صورة الغلاف", error.code) };
  }

  revalidateAll();
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  revalidatePath(`/dashboard/properties/${propertyId}/preview`);
  return {};
}

export async function duplicateProperty(
  id: string,
): Promise<PropertyActionResult> {
  const supabase = await createClient();
  const agency = await getAgencyId(supabase);

  if (!agency.agencyId) {
    return { error: agency.error };
  }

  const ownership = await verifyPropertyOwnership(
    supabase,
    id,
    agency.agencyId,
  );
  if (ownership.error) {
    return ownership;
  }

  const { data: original, error: readError } = await supabase
    .from("properties")
    .select(DUPLICATE_SELECT)
    .eq("id", id)
    .eq("agency_id", agency.agencyId)
    .maybeSingle();

  if (readError) {
    logDatabaseError("duplicate read", readError);
    return { error: databaseErrorMessage("قراءة العقار للتكرار", readError.code) };
  }
  if (!original) {
    return { error: "العقار غير موجود أو لا ينتمي إلى وكالتك." };
  }

  const { error: insertError } = await supabase.from("properties").insert({
    ...original,
    agency_id: agency.agencyId,
    slug: uniqueSlug(original.title),
    is_published: false,
  });

  if (insertError) {
    logDatabaseError("duplicate", insertError);
    return { error: databaseErrorMessage("تكرار العقار", insertError.code) };
  }

  revalidateAll();
  return {};
}
