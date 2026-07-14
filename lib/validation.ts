/**
 * Server-side validation for the property form.
 * Zero external dependencies — just plain TS.
 */

import {
  AMENITIES_OPTIONS,
  FEATURES_OPTIONS,
  NEARBY_PLACES_OPTIONS,
} from "@/lib/types";
import {
  getDirectVideoUrl,
  getVirtualTourEmbedUrl,
  getYouTubeEmbedUrl,
} from "@/lib/embed-url";
import { WILAYAS } from "@/lib/wilayas";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const VALID_TYPES = new Set(["apartment", "villa", "commercial", "land"]);
const VALID_TRANSACTIONS = new Set(["sale", "rent"]);
const VALID_STATUSES = new Set(["available", "reserved", "sold", "rented"]);
const VALID_ENERGY = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const WILAYA_NAMES = new Set(WILAYAS.map((w) => w.name));
const VALID_AMENITIES = new Set(AMENITIES_OPTIONS);
const VALID_FEATURES = new Set(FEATURES_OPTIONS);
const VALID_NEARBY_PLACES = new Set(NEARBY_PLACES_OPTIONS);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function toInt(v: FormDataEntryValue | null): number {
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isInteger(n) ? n : Number.NaN;
}

function toNum(v: FormDataEntryValue | null): number {
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

function toNumOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toStringArray(v: FormDataEntryValue | null): string[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim());
  } catch {
    // fall through
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isValidUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Validation result type                                             */
/* ------------------------------------------------------------------ */

export type PropertyFormData = {
  id: string;
  title: string;
  price: number;
  transaction: string;
  type: string;
  wilaya: string;
  municipality: string;
  address: string;
  rooms: number;
  area: number;
  floor: number;
  bathrooms: number;
  description: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  /** Phase 9 fields */
  titleFr: string;
  descriptionFr: string;
  amenities: string[];
  nearbyPlaces: string[];
  features: string[];
  energyClass: string | null;
  constructionYear: number | null;
  parkingSpots: number;
  virtualTourUrl: string | null;
  videoUrl: string | null;
  isPublished: boolean;
};

export type ValidationResult =
  | { ok: true; data: PropertyFormData }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/*  Main validation function                                           */
/* ------------------------------------------------------------------ */

export function validatePropertyForm(formData: FormData): ValidationResult {
  const protectedFields = [
    "agency_id",
    "slug",
    "archived_at",
    "views_count",
    "contacts_count",
    "created_at",
    "updated_at",
  ];
  if (protectedFields.some((field) => formData.has(field))) {
    return { ok: false, error: "تحتوي البيانات على حقول غير مسموح بها." };
  }

  const id = str(formData.get("id"));
  const title = str(formData.get("title"));
  const price = str(formData.get("price"));
  const wilaya = str(formData.get("wilaya"));
  const type = str(formData.get("type"));
  const transaction = str(formData.get("transaction"));

  if (id && !UUID_PATTERN.test(id)) {
    return { ok: false, error: "معرّف العقار غير صالح." };
  }

  // --- Required fields ---
  if (!title) return { ok: false, error: "العنوان مطلوب." };
  if (title.length < 5) return { ok: false, error: "العنوان يجب أن يكون 5 أحرف على الأقل." };
  if (title.length > 200) return { ok: false, error: "العنوان يجب ألا يتجاوز 200 حرف." };
  if (!price) return { ok: false, error: "السعر مطلوب." };
  if (
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0 ||
    Number(price) > 1_000_000_000_000_000
  ) {
    return { ok: false, error: "السعر يجب أن يكون رقمًا أكبر من صفر." };
  }
  if (!wilaya) return { ok: false, error: "الولاية مطلوبة." };
  if (!WILAYA_NAMES.has(wilaya)) return { ok: false, error: "الولاية غير صالحة." };
  if (!VALID_TYPES.has(type)) return { ok: false, error: "نوع العقار غير صالح." };
  if (!VALID_TRANSACTIONS.has(transaction)) return { ok: false, error: "نوع المعاملة غير صالح." };

  // --- Status ---
  const status = str(formData.get("status")) || "available";
  if (!VALID_STATUSES.has(status)) return { ok: false, error: "حالة العقار غير صالحة." };

  // --- Numeric fields ---
  const area = toNum(formData.get("area"));
  const rooms = toInt(formData.get("rooms"));
  const bathrooms = toInt(formData.get("bathrooms"));
  const floor = toInt(formData.get("floor"));
  const parkingSpots = toInt(formData.get("parking_spots"));

  if (!Number.isFinite(area) || area < 0 || area > 100_000_000) {
    return { ok: false, error: "المساحة يجب أن تكون رقمًا موجبًا أو صفرًا." };
  }
  if (!Number.isInteger(rooms) || rooms < 0 || rooms > 100) {
    return { ok: false, error: "عدد الغرف غير صالح." };
  }
  if (!Number.isInteger(bathrooms) || bathrooms < 0 || bathrooms > 100) {
    return { ok: false, error: "عدد الحمامات غير صالح." };
  }
  if (!Number.isInteger(floor) || floor < 0 || floor > 300) {
    return { ok: false, error: "رقم الطابق غير صالح." };
  }
  if (!Number.isInteger(parkingSpots) || parkingSpots < 0 || parkingSpots > 1000) {
    return { ok: false, error: "عدد مواقف السيارات غير صالح." };
  }

  // --- Optional: Energy class ---
  const energyClassRaw = str(formData.get("energy_class"));
  if (energyClassRaw && !VALID_ENERGY.has(energyClassRaw)) {
    return { ok: false, error: "التصنيف الطاقوي غير صالح." };
  }
  const energyClass = energyClassRaw && VALID_ENERGY.has(energyClassRaw) ? energyClassRaw : null;

  // --- Optional: Construction year ---
  const constructionYearRaw = str(formData.get("construction_year"));
  const constructionYear = toNumOrNull(formData.get("construction_year"));
  if (constructionYearRaw && constructionYear === null) {
    return { ok: false, error: "سنة البناء غير صالحة." };
  }
  if (constructionYear !== null) {
    const currentYear = new Date().getFullYear();
    if (
      !Number.isInteger(constructionYear) ||
      constructionYear < 1900 ||
      constructionYear > currentYear
    ) {
      return { ok: false, error: `سنة البناء يجب أن تكون بين 1900 و${currentYear}.` };
    }
  }

  // --- Optional: URLs ---
  const virtualTourRaw = str(formData.get("virtual_tour_url"));
  const videoRaw = str(formData.get("video_url"));
  const virtualTourUrl = virtualTourRaw || null;
  const videoUrl = videoRaw || null;
  if (
    virtualTourUrl &&
    (virtualTourUrl.length > 2_048 ||
      !isValidUrl(virtualTourUrl) ||
      !getVirtualTourEmbedUrl(virtualTourUrl))
  ) {
    return {
      ok: false,
      error: "رابط الجولة الافتراضية غير صالح أو من مزود غير مدعوم.",
    };
  }
  if (
    videoUrl &&
    (videoUrl.length > 2_048 ||
      !isValidUrl(videoUrl) ||
      (!getYouTubeEmbedUrl(videoUrl) && !getDirectVideoUrl(videoUrl)))
  ) {
    return { ok: false, error: "رابط الفيديو غير صالح." };
  }

  // --- Arrays ---
  const amenities = toStringArray(formData.get("amenities"));
  const nearbyPlaces = toStringArray(formData.get("nearby_places"));
  const features = toStringArray(formData.get("features"));

  if (
    amenities.length > AMENITIES_OPTIONS.length ||
    features.length > FEATURES_OPTIONS.length ||
    nearbyPlaces.length > NEARBY_PLACES_OPTIONS.length ||
    new Set(amenities).size !== amenities.length ||
    new Set(features).size !== features.length ||
    new Set(nearbyPlaces).size !== nearbyPlaces.length
  ) {
    return { ok: false, error: "تحتوي القوائم على قيم مكررة أو كثيرة جدًا." };
  }

  if (amenities.some((item) => !VALID_AMENITIES.has(item))) {
    return { ok: false, error: "تحتوي قائمة المرافق على قيمة غير صالحة." };
  }
  if (features.some((item) => !VALID_FEATURES.has(item))) {
    return { ok: false, error: "تحتوي قائمة المميزات على قيمة غير صالحة." };
  }
  if (nearbyPlaces.some((item) => !VALID_NEARBY_PLACES.has(item))) {
    return { ok: false, error: "تحتوي قائمة الأماكن القريبة على قيمة غير صالحة." };
  }

  const municipality = str(formData.get("municipality"));
  const address = str(formData.get("address"));
  const description = str(formData.get("description"));
  const titleFr = str(formData.get("title_fr"));
  const descriptionFr = str(formData.get("description_fr"));

  if (municipality.length > 120 || address.length > 300) {
    return { ok: false, error: "بيانات الموقع طويلة جدًا." };
  }
  if (description.length > 10_000 || descriptionFr.length > 10_000) {
    return { ok: false, error: "وصف العقار طويل جدًا." };
  }
  if (titleFr.length > 200) {
    return { ok: false, error: "العنوان الفرنسي طويل جدًا." };
  }

  const latitudeRaw = str(formData.get("latitude"));
  const longitudeRaw = str(formData.get("longitude"));
  const latitude = toNumOrNull(formData.get("latitude"));
  const longitude = toNumOrNull(formData.get("longitude"));

  if (latitudeRaw && (latitude === null || latitude < -90 || latitude > 90)) {
    return { ok: false, error: "خط العرض غير صالح." };
  }
  if (
    longitudeRaw &&
    (longitude === null || longitude < -180 || longitude > 180)
  ) {
    return { ok: false, error: "خط الطول غير صالح." };
  }
  if ((latitude === null) !== (longitude === null)) {
    return { ok: false, error: "يرجى إدخال خط العرض وخط الطول معًا." };
  }

  // --- Publishing ---
  const isPublished = str(formData.get("is_published")) === "true";

  return {
    ok: true,
    data: {
      id,
      title,
      price: toNum(formData.get("price")),
      transaction,
      type,
      wilaya,
      municipality,
      address,
      rooms,
      area,
      floor,
      bathrooms,
      description,
      status,
      latitude,
      longitude,
      titleFr,
      descriptionFr,
      amenities,
      nearbyPlaces,
      features,
      energyClass,
      constructionYear,
      parkingSpots,
      virtualTourUrl,
      videoUrl,
      isPublished,
    },
  };
}
