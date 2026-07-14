import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { PropertyMapView } from "@/components/public/property-map-view";
import { getAvailableProperties } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Carte des biens",
  description:
    "Explorez les biens immobiliers disponibles en Algérie sur une carte interactive. تصفّح العقارات المتوفرة على الخريطة.",
  alternates: { canonical: "/carte" },
};

export const dynamic = "force-dynamic";

const LEGEND = [
  { label: "شقة · Appartement", color: "#2563eb" },
  { label: "فيلا · Villa", color: "#16a34a" },
  { label: "محل · Commercial", color: "#f97316" },
  { label: "أرض · Terrain", color: "#92400e" },
];

export default async function CartePage() {
  const properties = await getAvailableProperties();

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            الخريطة · Carte des biens
          </h1>
          <p className="text-sm text-muted-foreground">
            {properties.length} عقار متوفر على الخريطة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <MapPin className="size-4" style={{ color: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <PropertyMapView
        properties={properties}
        className="h-[70vh] rounded-xl border border-border"
      />
    </div>
  );
}
