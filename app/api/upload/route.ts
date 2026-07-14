import { NextResponse } from "next/server";

import {
  ImageValidationError,
  isAllowedImageType,
  isUuid,
  MAX_IMAGE_BYTES,
  MAX_MULTIPART_BYTES,
  MAX_PROPERTY_IMAGES,
  createPropertyPhotoKey,
  parsePropertyPhotoKey,
  validateAndNormalizeImage,
} from "@/lib/image-security";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteFile,
  getPublicUrl,
  keyFromUrl,
  uploadFile,
} from "@/lib/storage";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function logUploadError(operation: string, error?: { code?: string }): void {
  console.error(`[property-images:${operation}]`, {
    code: error?.code ?? "unexpected",
  });
}

async function verifyPropertyOwner(
  supabase: ServerSupabaseClient,
  propertyId: string,
  userId: string,
): Promise<{ owned: boolean; failed: boolean }> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, agencies!inner(owner_id)")
    .eq("id", propertyId)
    .eq("agencies.owner_id", userId)
    .maybeSingle();

  if (error) {
    logUploadError("ownership", error);
    return { owned: false, failed: true };
  }

  return { owned: Boolean(data), failed: false };
}

async function removeStorageObject(
  supabase: ServerSupabaseClient,
  key: string,
): Promise<string | null> {
  try {
    await deleteFile(supabase, key);
    return null;
  } catch (error) {
    logUploadError(
      "storage-cleanup",
      typeof error === "object" && error !== null && "code" in error
        ? { code: String(error.code) }
        : undefined,
    );
    return "تم تحديث بيانات الصور، لكن تعذر حذف الملف من التخزين. يرجى التواصل مع الدعم.";
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return jsonError("التخزين غير مُعدّ بعد.", 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return jsonError("حجم طلب رفع الصورة كبير جدًا.", 413);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logUploadError("authentication", authError);
    return jsonError("تعذر التحقق من الجلسة. يرجى تسجيل الدخول مجددًا.", 401);
  }
  if (!user) {
    return jsonError("يجب تسجيل الدخول لرفع الصور.", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    logUploadError("multipart");
    return jsonError("تعذر قراءة ملف الصورة.", 400);
  }

  const file = formData.get("file");
  const propertyId = String(formData.get("propertyId") ?? "").trim();

  if (!(file instanceof File) || !propertyId) {
    return jsonError("ملف أو معرّف العقار مفقود.", 400);
  }
  if (!isUuid(propertyId)) {
    return jsonError("معرّف العقار غير صالح.", 400);
  }
  if (!isAllowedImageType(file.type)) {
    return jsonError("صيغة غير مدعومة (JPG / PNG / WEBP فقط).", 400);
  }
  if (file.size === 0) {
    return jsonError("ملف الصورة فارغ.", 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return jsonError("حجم الصورة يتجاوز 3.5 ميغابايت.", 400);
  }

  const ownership = await verifyPropertyOwner(supabase, propertyId, user.id);
  if (ownership.failed) {
    return jsonError("تعذر التحقق من ملكية العقار.", 500);
  }
  if (!ownership.owned) {
    return jsonError("العقار غير موجود أو لا ينتمي إلى وكالتك.", 403);
  }

  const { count, error: countError } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (countError) {
    logUploadError("count", countError);
    return jsonError("تعذر التحقق من عدد الصور الحالي.", 500);
  }
  if ((count ?? 0) >= MAX_PROPERTY_IMAGES) {
    return jsonError(
      `لا يمكن إضافة أكثر من ${MAX_PROPERTY_IMAGES} صور للعقار.`,
      409,
    );
  }

  const { data: lastImage, error: orderError } = await supabase
    .from("property_images")
    .select("order")
    .eq("property_id", propertyId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    logUploadError("order", orderError);
    return jsonError("تعذر ترتيب الصورة الجديدة.", 500);
  }

  let normalizedImage: Awaited<ReturnType<typeof validateAndNormalizeImage>>;
  try {
    normalizedImage = await validateAndNormalizeImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return jsonError(error.userMessage, 400);
    }
    logUploadError("decode");
    return jsonError("تعذر التحقق من ملف الصورة.", 400);
  }

  const key = createPropertyPhotoKey(propertyId, normalizedImage.extension);
  try {
    await uploadFile(
      supabase,
      normalizedImage.bytes,
      key,
      normalizedImage.contentType,
    );
  } catch (error) {
    logUploadError(
      "storage-upload",
      typeof error === "object" && error !== null && "code" in error
        ? { code: String(error.code) }
        : undefined,
    );
    return jsonError("فشل رفع الصورة إلى التخزين.", 500);
  }

  const url = getPublicUrl(key);
  const { data: inserted, error: insertError } = await supabase
    .from("property_images")
    .insert({
      property_id: propertyId,
      url,
      order: (lastImage?.order ?? -1) + 1,
    })
    .select("id, url, is_cover")
    .single();

  if (insertError || !inserted) {
    if (insertError) {
      logUploadError("row-insert", insertError);
    }
    await removeStorageObject(supabase, key);

    if (insertError?.code === "23514") {
      return jsonError(
        `لا يمكن إضافة أكثر من ${MAX_PROPERTY_IMAGES} صور للعقار.`,
        409,
      );
    }
    return jsonError("فشل حفظ بيانات الصورة.", 500);
  }

  return NextResponse.json({
    id: inserted.id,
    url: inserted.url,
    thumbnailUrl: null,
    isCover: inserted.is_cover,
  });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return jsonError("التخزين غير مُعدّ بعد.", 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logUploadError("authentication", authError);
    return jsonError("تعذر التحقق من الجلسة. يرجى تسجيل الدخول مجددًا.", 401);
  }
  if (!user) {
    return jsonError("يجب تسجيل الدخول لحذف الصور.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات طلب الحذف غير صالحة.", 400);
  }

  const id =
    typeof body === "object" && body !== null && "id" in body
      ? String(body.id).trim()
      : "";

  if (!isUuid(id)) {
    return jsonError("معرّف الصورة غير صالح.", 400);
  }

  const { data: image, error: imageError } = await supabase
    .from("property_images")
    .select("id, url, property_id")
    .eq("id", id)
    .maybeSingle();

  if (imageError) {
    logUploadError("row-lookup", imageError);
    return jsonError("تعذر تحميل بيانات الصورة.", 500);
  }
  if (!image) {
    return jsonError("الصورة غير موجودة.", 404);
  }

  const ownership = await verifyPropertyOwner(
    supabase,
    image.property_id,
    user.id,
  );
  if (ownership.failed) {
    return jsonError("تعذر التحقق من ملكية العقار.", 500);
  }
  if (!ownership.owned) {
    return jsonError("الصورة لا تنتمي إلى عقار وكالتك.", 403);
  }

  const key = keyFromUrl(image.url);
  const parsedKey = key ? parsePropertyPhotoKey(key) : null;
  const canDeleteStorageObject =
    parsedKey?.propertyId.toLowerCase() === image.property_id.toLowerCase();

  const { data: deleted, error: deleteError } = await supabase
    .from("property_images")
    .delete()
    .eq("id", id)
    .eq("property_id", image.property_id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logUploadError("row-delete", deleteError);
    return jsonError("فشل حذف بيانات الصورة.", 500);
  }
  if (!deleted) {
    return jsonError("الصورة غير موجودة أو لا تنتمي إلى وكالتك.", 403);
  }

  const { data: cover, error: coverError } = await supabase
    .from("property_images")
    .select("id")
    .eq("property_id", image.property_id)
    .eq("is_cover", true)
    .maybeSingle();

  if (coverError) {
    logUploadError("cover-lookup", coverError);
  }

  let warning: string | null = coverError
    ? "تم حذف الصورة، لكن تعذر التحقق من صورة الغلاف الجديدة."
    : null;
  if (key && canDeleteStorageObject) {
    warning = (await removeStorageObject(supabase, key)) ?? warning;
  } else {
    logUploadError("unsafe-storage-key");
    warning =
      warning ??
      "تم حذف بيانات الصورة، لكن تعذر التحقق من مسار ملف التخزين.";
  }

  return NextResponse.json({
    ok: true,
    coverId: cover?.id ?? null,
    warning,
  });
}
