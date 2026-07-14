"use client";

import { useEffect } from "react";

import { trackPropertyViewAction } from "@/app/(public)/(marketplace)/biens/[id]/actions";

const VIEW_STORAGE_PREFIX = "immo_dz_property_viewed:";

/**
 * Temporary client-side view deduplication strategy.
 *
 * Keeping sessionStorage and the Server Action behind this component makes the
 * strategy replaceable later without changing the property page's public API.
 * It prevents ordinary refreshes in the same tab from incrementing twice; it
 * is intentionally not a durable visitor identity system.
 */
export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const storageKey = `${VIEW_STORAGE_PREFIX}${propertyId}`;
    if (sessionStorage.getItem(storageKey)) return;

    sessionStorage.setItem(storageKey, "pending");
    void trackPropertyViewAction(propertyId)
      .then((tracked) => {
        if (tracked) {
          sessionStorage.setItem(storageKey, "tracked");
        } else {
          sessionStorage.removeItem(storageKey);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(storageKey);
      });
  }, [propertyId]);

  return null;
}
