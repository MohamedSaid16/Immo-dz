export const PROPERTY_MARKETING_FIELDS = [
  "title_ar",
  "description_ar",
  "title_fr",
  "description_fr",
  "facebook_post",
  "instagram_caption",
  "whatsapp_message",
  "seo_title",
  "seo_description",
] as const;

export type PropertyMarketingField = (typeof PROPERTY_MARKETING_FIELDS)[number];

export type PropertyMarketingOperation =
  | "generate"
  | "regenerate"
  | "improve"
  | "shorten";

export type PropertyMarketingContent = {
  title_ar: string;
  description_ar: string;
  title_fr: string;
  description_fr: string;
  facebook_post: string;
  instagram_caption: string;
  whatsapp_message: string;
  seo_title: string;
  seo_description: string;
};

export type PropertyMarketingFacts = {
  title_ar?: string;
  description_ar?: string;
  title_fr?: string;
  description_fr?: string;
  price?: number;
  transaction?: string;
  type?: string;
  wilaya?: string;
  municipality?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  bathrooms?: number;
  status?: string;
  amenities?: string[];
  nearby_places?: string[];
  features?: string[];
  energy_class?: string;
  construction_year?: number;
  parking_spots?: number;
};

export type PropertyMarketingRequest = {
  facts: PropertyMarketingFacts;
  operation: PropertyMarketingOperation;
  previous_content?: PropertyMarketingContent;
};

export type AiQuotaInfo = {
  used: number;
  limit: number;
};

export type PropertyMarketingActionResult =
  | {
      ok: true;
      content: PropertyMarketingContent;
      quota: AiQuotaInfo;
    }
  | {
      ok: false;
      error: string;
      quota?: AiQuotaInfo;
    };

export const PROPERTY_MARKETING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title_ar: { type: "string" },
    description_ar: { type: "string" },
    title_fr: { type: "string" },
    description_fr: { type: "string" },
    facebook_post: { type: "string" },
    instagram_caption: { type: "string" },
    whatsapp_message: { type: "string" },
    seo_title: { type: "string" },
    seo_description: { type: "string" },
  },
  required: [...PROPERTY_MARKETING_FIELDS],
} as const;

export class AiProviderError extends Error {
  readonly kind: "configuration" | "timeout" | "rate_limit" | "provider" | "invalid_output";
  readonly status?: number;

  constructor(
    kind: AiProviderError["kind"],
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export interface PropertyMarketingProvider {
  generate(request: PropertyMarketingRequest): Promise<PropertyMarketingContent>;
}
