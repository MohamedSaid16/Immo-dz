"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

// Leaflet touches `window`, so the map is loaded client-side only (no SSR).
const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  ),
});

export function PropertyMapView({
  properties,
  center,
  zoom,
  className,
}: {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <PropertyMap
        properties={properties}
        center={center}
        zoom={zoom}
        className="h-full w-full"
      />
    </div>
  );
}
