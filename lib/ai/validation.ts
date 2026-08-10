import {
  PROPERTY_MARKETING_FIELDS,
  type PropertyMarketingContent,
} from "./contracts";

export const PROPERTY_MARKETING_LIMITS = {
  title_ar: 200,
  title_fr: 200,
  description_ar: 4000,
  description_fr: 4000,
  facebook_post: 2000,
  instagram_caption: 1500,
  whatsapp_message: 1000,
  seo_title: 70,
  seo_description: 180,
} as const satisfies Record<(typeof PROPERTY_MARKETING_FIELDS)[number], number>;

const UNSAFE_CONTENT_PATTERN = /<\/?[a-z][^>]*>|javascript:|data:text\/html|https?:\/\/|www\./i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    !UNSAFE_CONTENT_PATTERN.test(value) &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)
  );
}

export function validatePropertyMarketingContent(
  value: unknown,
):
  | { ok: true; content: PropertyMarketingContent }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "مخرجات المساعد غير صالحة." };
  }

  const keys = Object.keys(value).sort();
  const expectedKeys = [...PROPERTY_MARKETING_FIELDS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return { ok: false, error: "مخرجات المساعد لا تطابق البنية المطلوبة." };
  }

  for (const field of PROPERTY_MARKETING_FIELDS) {
    if (!isSafeText(value[field], PROPERTY_MARKETING_LIMITS[field])) {
      return { ok: false, error: "تحتوي مخرجات المساعد على نص غير صالح أو طويل جداً." };
    }
  }

  return {
    ok: true,
    content: {
      title_ar: value.title_ar as string,
      description_ar: value.description_ar as string,
      title_fr: value.title_fr as string,
      description_fr: value.description_fr as string,
      facebook_post: value.facebook_post as string,
      instagram_caption: value.instagram_caption as string,
      whatsapp_message: value.whatsapp_message as string,
      seo_title: value.seo_title as string,
      seo_description: value.seo_description as string,
    },
  };
}

export function validateMarketingOperation(
  operation: unknown,
): operation is "generate" | "regenerate" | "improve" | "shorten" {
  return (
    operation === "generate" ||
    operation === "regenerate" ||
    operation === "improve" ||
    operation === "shorten"
  );
}
