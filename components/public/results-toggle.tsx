"use client";

import { useState } from "react";
import { LayoutGrid, MapPin } from "lucide-react";

import { PropertyCard } from "./property-card";
import { PropertyMapView } from "./property-map-view";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

/** Switches the search results between a card grid and the map. */
export function ResultsToggle({ properties }: { properties: Property[] }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "map"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MapPin className="size-4" />
            Carte
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <PropertyMapView
          properties={properties}
          className="h-[70vh] rounded-xl border border-border"
        />
      )}
    </div>
  );
}
