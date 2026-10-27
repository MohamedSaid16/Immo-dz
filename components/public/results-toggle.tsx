"use client";

import { useState } from "react";
import { LayoutGrid, MapPin } from "lucide-react";
import { PropertyCard } from "./property-card";
import { PropertyMapView } from "./property-map-view";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function ResultsToggle({ properties }: { properties: Property[] }) {
  const [view, setView] = useState<"list" | "map">("list");
  return <div className="space-y-5"><div className="flex justify-start sm:justify-end" dir="rtl"><div className="inline-flex border border-[#e5e5e5] bg-white p-1"><button type="button" onClick={() => setView("list")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium", view === "list" ? "bg-[#111111] text-white" : "text-[#777777] hover:text-[#111111]")}><LayoutGrid className="size-4" />قائمة</button><button type="button" onClick={() => setView("map")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium", view === "map" ? "bg-[#111111] text-white" : "text-[#777777] hover:text-[#111111]")}><MapPin className="size-4" />خريطة</button></div></div>{view === "list" ? <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <PropertyMapView properties={properties} className="h-[70vh] border border-[#e5e5e5]" />}</div>;
}
