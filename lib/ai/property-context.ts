import { validatePropertyForm, type PropertyFormData } from "@/lib/validation";

import type {
  PropertyMarketingFacts,
  PropertyMarketingContent,
} from "./contracts";

export type PropertyMarketingContextResult =
  | {
      ok: true;
      propertyId: string | null;
      facts: PropertyMarketingFacts;
    }
  | { ok: false; error: string };

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addText(
  target: Record<string, unknown>,
  key: string,
  value: string,
): void {
  const cleaned = cleanText(value);
  if (cleaned) target[key] = cleaned;
}

function addPositiveNumber(
  target: Record<string, unknown>,
  key: string,
  value: number,
): void {
  if (Number.isFinite(value) && value > 0) target[key] = value;
}

function buildFacts(data: PropertyFormData): PropertyMarketingFacts {
  const facts: Record<string, unknown> = {};

  addText(facts, "title_ar", data.title);
  addText(facts, "description_ar", data.description);
  addText(facts, "title_fr", data.titleFr);
  addText(facts, "description_fr", data.descriptionFr);
  addPositiveNumber(facts, "price", data.price);
  addText(facts, "transaction", data.transaction);
  addText(facts, "type", data.type);
  addText(facts, "wilaya", data.wilaya);
  addText(facts, "municipality", data.municipality);
  addPositiveNumber(facts, "rooms", data.rooms);
  addPositiveNumber(facts, "area", data.area);
  addPositiveNumber(facts, "floor", data.floor);
  addPositiveNumber(facts, "bathrooms", data.bathrooms);
  addText(facts, "status", data.status);
  addText(facts, "energy_class", data.energyClass ?? "");
  addPositiveNumber(facts, "construction_year", data.constructionYear ?? 0);
  addPositiveNumber(facts, "parking_spots", data.parkingSpots);

  if (data.amenities.length > 0) facts.amenities = data.amenities.map(cleanText);
  if (data.nearbyPlaces.length > 0) {
    facts.nearby_places = data.nearbyPlaces.map(cleanText);
  }
  if (data.features.length > 0) facts.features = data.features.map(cleanText);

  return facts as PropertyMarketingFacts;
}

export function createPropertyMarketingContext(
  formData: FormData,
): PropertyMarketingContextResult {
  const result = validatePropertyForm(formData);
  if (!result.ok) return result;

  return {
    ok: true,
    propertyId: result.data.id || null,
    facts: buildFacts(result.data),
  };
}

export function isPreviousContent(value: unknown): value is PropertyMarketingContent {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 9 &&
    Object.keys(value).every((key) => typeof (value as Record<string, unknown>)[key] === "string")
  );
}
