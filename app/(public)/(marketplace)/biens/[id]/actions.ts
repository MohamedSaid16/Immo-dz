"use server";

import { isUuid } from "@/lib/lead-validation";
import { incrementViewCount } from "@/lib/properties";

export async function trackPropertyViewAction(
  propertyId: string,
): Promise<boolean> {
  if (!isUuid(propertyId)) return false;
  return incrementViewCount(propertyId);
}
