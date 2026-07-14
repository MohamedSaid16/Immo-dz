import type { MetadataRoute } from "next";

import {
  getAbsoluteUrl,
  getAgencyPath,
  getPropertyPath,
  getTransactionWilayaPath,
} from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { WILAYAS } from "@/lib/wilayas";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getAbsoluteUrl("/biens"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/carte"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  if (!isSupabaseConfigured()) {
    console.error("[sitemap:configuration] Supabase is not configured.");
    return routes;
  }

  const supabase = await createClient();
  const { data: properties, error: propertyError } = await supabase
    .from("properties")
    .select("id, slug, transaction, wilaya, updated_at")
    .eq("is_published", true)
    .is("archived_at", null);

  if (propertyError) {
    console.error("[sitemap:properties]", {
      code: propertyError.code ?? "unexpected",
    });
  } else {
    const validWilayas = new Set(WILAYAS.map((wilaya) => wilaya.name));
    const landingPages = new Set<string>();

    for (const property of properties) {
      routes.push({
        url: getAbsoluteUrl(getPropertyPath(property.slug || property.id)),
        lastModified: new Date(property.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });

      if (property.wilaya && validWilayas.has(property.wilaya)) {
        const transaction = property.transaction === "sale" ? "vente" : "location";
        landingPages.add(getTransactionWilayaPath(transaction, property.wilaya));
      }
    }

    for (const path of landingPages) {
      routes.push({
        url: getAbsoluteUrl(path),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  const { data: agencies, error: agencyError } = await supabase
    .from("agencies")
    .select("id, created_at");

  if (agencyError) {
    console.error("[sitemap:agencies]", {
      code: agencyError.code ?? "unexpected",
    });
  } else {
    for (const agency of agencies) {
      routes.push({
        url: getAbsoluteUrl(getAgencyPath(agency.id)),
        lastModified: new Date(agency.created_at),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return routes;
}
