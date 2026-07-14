"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeLeadSource } from "@/lib/lead-validation";
import type { LeadSource } from "@/lib/types";

export const LEAD_SOURCE_STORAGE_KEY = "immo_dz_lead_source";

function determineSource(ref: string | null, referrer: string): LeadSource {
  if (ref) {
    const normalizedRef = ref.trim().toLowerCase();
    const aliases: Record<string, LeadSource> = {
      fb: "facebook",
      ig: "instagram",
      wa: "whatsapp",
      tg: "telegram",
    };
    return aliases[normalizedRef] ?? normalizeLeadSource(normalizedRef);
  }

  if (referrer) {
    const lReferrer = referrer.toLowerCase();
    if (lReferrer.includes("google.com")) return "google";
    if (lReferrer.includes("facebook.com")) return "facebook";
    if (lReferrer.includes("instagram.com")) return "instagram";
    if (lReferrer.includes("whatsapp.com") || lReferrer.includes("wa.me")) return "whatsapp";
    if (lReferrer.includes("t.me")) return "telegram";
    if (lReferrer.includes(window.location.hostname)) return "unknown";
    return "referral";
  }

  return "direct";
}

/**
 * LeadTracker component silently listens to the URL and Referrer
 * to store the acquisition source in sessionStorage.
 * This is used later when the user submits a contact form (Lead).
 */
export function LeadTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("utm_source");
    const source = determineSource(ref, document.referrer);
    const stored = normalizeLeadSource(
      sessionStorage.getItem(LEAD_SOURCE_STORAGE_KEY),
    );
    const hasMeaningfulStoredSource = stored !== "unknown" && stored !== "direct";
    const hasMeaningfulNewSource = source !== "unknown" && source !== "direct";

    if (hasMeaningfulStoredSource) return;

    if (hasMeaningfulNewSource || stored === "unknown") {
      sessionStorage.setItem(LEAD_SOURCE_STORAGE_KEY, source);
    }
  }, [searchParams]);

  return null;
}

export function getStoredLeadSource(): LeadSource {
  if (typeof window === "undefined") return "unknown";
  return normalizeLeadSource(sessionStorage.getItem(LEAD_SOURCE_STORAGE_KEY));
}
