import type {
  InteractionEvent,
  LeadSource,
  LeadStatus,
  LeadType,
} from "@/lib/types";

export const LEAD_FIELD_LIMITS = {
  name: 100,
  phoneDigitsMin: 9,
  phoneDigitsMax: 15,
  email: 254,
  message: 2_000,
  notes: 5_000,
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LEAD_TYPES = new Set<LeadType>(["info", "visit", "reservation"]);
const LEAD_SOURCES = new Set<LeadSource>([
  "google",
  "whatsapp",
  "facebook",
  "instagram",
  "telegram",
  "direct",
  "referral",
  "unknown",
]);
const LEAD_STATUSES = new Set<LeadStatus>([
  "new",
  "contacted",
  "visit_scheduled",
  "visited",
  "negotiating",
  "converted",
  "lost",
]);
const INTERACTION_EVENTS = new Set<InteractionEvent>([
  "phone_click",
  "whatsapp_click",
  "share",
  "favorite",
  "property_view",
  "copy_link",
  "native_share",
  "whatsapp_share",
  "facebook_share",
  "telegram_share",
  "email_share",
  "qr_code_opened",
  "qr_code_downloaded",
]);

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseLeadType(value: string): LeadType | null {
  return LEAD_TYPES.has(value as LeadType) ? (value as LeadType) : null;
}

export function normalizeLeadSource(value: unknown): LeadSource {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  return LEAD_SOURCES.has(normalized as LeadSource)
    ? (normalized as LeadSource)
    : "unknown";
}

export function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.has(value as LeadStatus);
}

export function isInteractionEvent(
  value: string,
): value is InteractionEvent {
  return INTERACTION_EVENTS.has(value as InteractionEvent);
}

export type ValidLeadSubmission = {
  agencyId: string;
  propertyId: string;
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: LeadSource;
};

type LeadValidationResult =
  | { ok: true; data: ValidLeadSubmission }
  | { ok: false; error: string };

export function validateLeadSubmission(input: {
  agencyId: string;
  propertyId: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  source: unknown;
}): LeadValidationResult {
  if (!isUuid(input.agencyId) || !isUuid(input.propertyId)) {
    return { ok: false, error: "معلومات العقار غير صالحة." };
  }

  const type = parseLeadType(input.type);
  if (!type) return { ok: false, error: "نوع الطلب غير صالح." };

  if (input.name.length < 2) {
    return { ok: false, error: "يرجى إدخال اسم صحيح." };
  }
  if (input.name.length > LEAD_FIELD_LIMITS.name) {
    return { ok: false, error: "الاسم طويل جداً." };
  }

  const phoneDigits = input.phone.replace(/\D/g, "");
  if (
    phoneDigits.length < LEAD_FIELD_LIMITS.phoneDigitsMin ||
    phoneDigits.length > LEAD_FIELD_LIMITS.phoneDigitsMax
  ) {
    return { ok: false, error: "رقم الهاتف غير صالح." };
  }

  if (input.email) {
    if (
      input.email.length > LEAD_FIELD_LIMITS.email ||
      !EMAIL_PATTERN.test(input.email)
    ) {
      return { ok: false, error: "البريد الإلكتروني غير صالح." };
    }
  }

  if (input.message.length > LEAD_FIELD_LIMITS.message) {
    return { ok: false, error: "الرسالة طويلة جداً." };
  }

  return {
    ok: true,
    data: {
      agencyId: input.agencyId,
      propertyId: input.propertyId,
      type,
      name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      message: input.message || undefined,
      source: normalizeLeadSource(input.source),
    },
  };
}

export function validateLeadNotes(notes: string): string | null {
  if (notes.length > LEAD_FIELD_LIMITS.notes) {
    return `لا يمكن أن تتجاوز الملاحظات ${LEAD_FIELD_LIMITS.notes} حرف.`;
  }
  return null;
}
