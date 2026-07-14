"use client";

import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { PropertyPlaceholder } from "./property-placeholder";
import { Badge } from "@/components/ui/badge";
import { formatDZD } from "@/lib/utils";
import { resolveCoords } from "@/lib/wilayas";
import {
  PROPERTY_TYPE_LABELS,
  TRANSACTION_LABELS,
  type Property,
  type PropertyType,
} from "@/lib/types";

const PIN_COLORS: Record<PropertyType, string> = {
  apartment: "#2563eb", // blue
  villa: "#16a34a", // green
  commercial: "#f97316", // orange
  land: "#92400e", // brown
};

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(type: PropertyType): L.DivIcon {
  const color = PIN_COLORS[type];
  let icon = iconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "immo-pin",
      html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="white"/>
      </svg>`,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      popupAnchor: [0, -34],
    });
    iconCache.set(color, icon);
  }
  return icon;
}

export default function PropertyMap({
  properties,
  center = [36.7, 3.2],
  zoom = 6,
  className = "h-full w-full",
}: {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  const pins = properties
    .map((property) => {
      const coords = resolveCoords(
        property.latitude,
        property.longitude,
        property.wilaya,
      );
      return coords ? { property, coords } : null;
    })
    .filter((x): x is { property: Property; coords: { lat: number; lng: number } } => x !== null);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className={className}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pins.map(({ property, coords }) => (
        <Marker
          key={property.id}
          position={[coords.lat, coords.lng]}
          icon={pinIcon(property.type)}
        >
          <Popup>
            <div dir="rtl" className="w-52">
              {property.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.photos[0].url}
                  alt={property.title}
                  loading="lazy"
                  className="h-28 w-full rounded-md object-cover"
                />
              ) : (
                <PropertyPlaceholder
                  type={property.type}
                  className="h-28 w-full rounded-md"
                />
              )}

              <div className="mt-2 space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {property.title}
                </p>
                <p className="text-base font-extrabold text-primary">
                  {formatDZD(property.price)}
                  <span className="text-xs font-medium text-muted-foreground">
                    {property.transaction === "rent" ? " دج/شهر" : " دج"}
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">
                    {PROPERTY_TYPE_LABELS[property.type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {property.wilaya} · {TRANSACTION_LABELS[property.transaction]}
                  </span>
                </div>
                <Link
                  href={`/biens/${property.id}`}
                  className="mt-1 block rounded-md bg-primary px-3 py-1.5 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Voir le bien · عرض العقار
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
