/** Domain types + label maps shared across the app. */

export type PropertyStatus = "available" | "reserved" | "sold" | "rented";

export const STATUS_LABELS: Record<
  PropertyStatus,
  { label: string; variant: "success" | "warning" | "muted" }
> = {
  available: { label: "متوفر", variant: "success" },
  reserved: { label: "محجوز", variant: "warning" },
  sold: { label: "مباع", variant: "muted" },
  rented: { label: "مؤجر", variant: "muted" },
};

export type PropertyType = "apartment" | "villa" | "commercial" | "land";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "شقة",
  villa: "فيلا",
  commercial: "محل تجاري",
  land: "أرض",
};

export type TransactionType = "sale" | "rent";

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  sale: "بيع",
  rent: "إيجار",
};

/* ------------------------------------------------------------------ */
/*  Energy Classification (DPE-style)                                  */
/* ------------------------------------------------------------------ */

export type EnergyClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export const ENERGY_CLASSES: {
  value: EnergyClass;
  label: string;
  color: string;
}[] = [
  { value: "A", label: "A — ممتاز", color: "#22c55e" },
  { value: "B", label: "B — جيد جداً", color: "#4ade80" },
  { value: "C", label: "C — جيد", color: "#a3e635" },
  { value: "D", label: "D — متوسط", color: "#facc15" },
  { value: "E", label: "E — ضعيف", color: "#fb923c" },
  { value: "F", label: "F — سيء", color: "#f87171" },
  { value: "G", label: "G — سيء جداً", color: "#ef4444" },
];

/* ------------------------------------------------------------------ */
/*  Amenities / Features / Nearby (predefined options)                 */
/* ------------------------------------------------------------------ */

export const AMENITIES_OPTIONS: string[] = [
  "مصعد",
  "حارس",
  "كاميرات مراقبة",
  "إنتركوم",
  "باب مصفح",
  "خزان ماء",
  "طاقة شمسية",
  "تدفئة مركزية",
  "تكييف",
  "شرفة",
  "تراس",
  "حديقة",
  "مسبح",
  "قبو",
  "مخزن",
];

export const FEATURES_OPTIONS: string[] = [
  "مطبخ مجهز",
  "أرضية رخام",
  "أرضية سيراميك",
  "نوافذ مزدوجة",
  "عزل حراري",
  "عزل صوتي",
  "واجهة حجرية",
  "سقف مرتفع",
  "إضاءة طبيعية",
  "إطلالة بحرية",
  "إطلالة جبلية",
  "غرفة غسيل",
  "جاكوزي",
];

export const NEARBY_PLACES_OPTIONS: string[] = [
  "مدرسة",
  "جامعة",
  "مسجد",
  "مستشفى",
  "صيدلية",
  "سوق",
  "مركز تجاري",
  "حديقة عامة",
  "محطة حافلات",
  "ترامواي",
  "مترو",
  "طريق سريع",
  "شاطئ",
  "بنك",
  "بريد",
];

/* ------------------------------------------------------------------ */
/*  Core types                                                         */
/* ------------------------------------------------------------------ */

/** Minimal agency info embedded alongside a property (for contact buttons). */
export type AgencyLite = {
  id: string;
  name: string;
  wilaya: string;
  phone: string | null;
};

export type Agency = AgencyLite & {
  address: string | null;
  about?: string | null;
};

export type PropertyImage = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  isCover: boolean;
};

export type Property = {
  id: string;
  agencyId: string;
  title: string;
  price: number;
  transaction: TransactionType;
  type: PropertyType;
  wilaya: string;
  municipality: string;
  address: string;
  rooms: number;
  area: number;
  floor: number;
  bathrooms: number;
  description: string;
  status: PropertyStatus;
  latitude: number | null;
  longitude: number | null;
  /** Uploaded photos (ordered; first is the cover). Empty → placeholder. */
  photos: PropertyImage[];
  /** Convenience count of `photos`. */
  images: number;
  createdAt: string;
  agency?: AgencyLite;

  /* --- Phase 9: Publishing workflow --- */
  slug: string | null;
  isPublished: boolean;
  archivedAt: string | null;

  /* --- Phase 9: Extended details --- */
  amenities: string[];
  nearbyPlaces: string[];
  features: string[];
  energyClass: EnergyClass | null;
  constructionYear: number | null;
  parkingSpots: number;
  virtualTourUrl: string | null;
  videoUrl: string | null;

  /* --- Phase 9: Multi-language --- */
  titleFr: string | null;
  descriptionFr: string | null;

  /* --- Phase 9: Statistics --- */
  viewsCount: number;
  contactsCount: number;
};

export type PropertyFilters = {
  wilaya?: string;
  type?: PropertyType;
  transaction?: TransactionType;
  minPrice?: number;
  maxPrice?: number;
  /** Minimum number of rooms. */
  rooms?: number;
};

/* ================================================================== */
/*  Phase 10: Lead Management (CRM)                                    */
/* ================================================================== */

export type LeadSource =
  | "google"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "telegram"
  | "direct"
  | "referral"
  | "unknown";

export type LeadType = "info" | "visit" | "reservation";

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  info: "طلب معلومات",
  visit: "طلب زيارة",
  reservation: "طلب حجز",
};

export type LeadStatus =
  | "new"
  | "contacted"
  | "visit_scheduled"
  | "visited"
  | "negotiating"
  | "converted"
  | "lost";

export const LEAD_STATUS_LABELS: Record<
  LeadStatus,
  { label: string; variant: "success" | "warning" | "muted" }
> = {
  new:             { label: "جديد",         variant: "warning" },
  contacted:       { label: "تم التواصل",   variant: "muted" },
  visit_scheduled: { label: "زيارة مجدولة", variant: "warning" },
  visited:         { label: "تمت الزيارة",  variant: "muted" },
  negotiating:     { label: "تفاوض",        variant: "warning" },
  converted:       { label: "تم التحويل",   variant: "success" },
  lost:            { label: "خسارة",        variant: "muted" },
};

/** Ordered pipeline steps for the status progression UI. */
export const LEAD_PIPELINE: LeadStatus[] = [
  "new",
  "contacted",
  "visit_scheduled",
  "visited",
  "negotiating",
  "converted",
  "lost",
];

export type Lead = {
  id: string;
  agencyId: string;
  propertyId: string | null;
  type: LeadType;
  status: LeadStatus;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  notes: string | null;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
  /** Joined from properties table. */
  propertyTitle?: string;
};

/* ================================================================== */
/*  Phase 10: Interaction Tracking (separate domain)                   */
/* ================================================================== */

export type InteractionEvent =
  | "phone_click"
  | "whatsapp_click"
  | "share"
  | "favorite"
  | "property_view"
  | "copy_link"
  | "native_share"
  | "whatsapp_share"
  | "facebook_share"
  | "telegram_share"
  | "email_share"
  | "qr_code_opened"
  | "qr_code_downloaded";

export const INTERACTION_LABELS: Record<InteractionEvent, string> = {
  phone_click:        "نقرة اتصال",
  whatsapp_click:     "نقرة واتساب",
  share:              "مشاركة (عام)",
  favorite:           "مفضلة",
  property_view:      "مشاهدة",
  copy_link:          "نسخ الرابط",
  native_share:       "مشاركة عبر النظام",
  whatsapp_share:     "مشاركة واتساب",
  facebook_share:     "مشاركة فيسبوك",
  telegram_share:     "مشاركة تيليجرام",
  email_share:        "مشاركة بالبريد",
  qr_code_opened:     "فتح QR",
  qr_code_downloaded: "تحميل QR",
};

export type Interaction = {
  id: string;
  propertyId: string;
  agencyId: string;
  event: InteractionEvent;
  metadata: Record<string, unknown>;
  createdAt: string;
};
