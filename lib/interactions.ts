"use server";

import { isInteractionEvent, isUuid } from "@/lib/lead-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { InteractionEvent } from "@/lib/types";

function logInteractionError(
  operation: string,
  context: Record<string, string>,
  error?: { code?: string },
): void {
  console.error(`[interactions:${operation}]`, {
    ...context,
    code: error?.code ?? "unexpected",
  });
}

/**
 * Track a public interaction without collecting user-agent, referrer, IP, or
 * other personal browsing data. Tracking is best-effort and never throws to
 * the sharing/contact UI.
 */
export async function trackInteraction(
  propertyId: string,
  agencyId: string,
  event: InteractionEvent,
  _metadata?: Record<string, unknown>,
): Promise<boolean> {
  // Metadata is intentionally ignored to avoid storing unnecessary personal
  // tracking data while preserving the existing public function signature.
  void _metadata;
  const context = { propertyId, agencyId, event };

  if (!isSupabaseConfigured()) {
    logInteractionError("configuration", context);
    return false;
  }
  if (
    !isUuid(propertyId) ||
    !isUuid(agencyId) ||
    !isInteractionEvent(event)
  ) {
    logInteractionError("validation", context);
    return false;
  }

  try {
    const supabase = await createClient();
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, agency_id")
      .eq("id", propertyId)
      .eq("agency_id", agencyId)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();

    if (propertyError) {
      logInteractionError("verify-property", context, propertyError);
      return false;
    }
    if (!property) {
      logInteractionError("property-unavailable", context);
      return false;
    }

    const { error: insertError } = await supabase.from("interactions").insert({
      property_id: property.id,
      agency_id: property.agency_id,
      event,
    });

    if (insertError) {
      logInteractionError("insert", context, insertError);
      return false;
    }

    return true;
  } catch (error) {
    void error;
    logInteractionError("unexpected", context);
    return false;
  }
}
