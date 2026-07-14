"use client";

import Image from "next/image";
import { useState } from "react";

import { PropertyPlaceholder } from "./property-placeholder";
import { cn } from "@/lib/utils";
import type { PropertyImage, PropertyType } from "@/lib/types";

/**
 * Photo gallery. Renders real uploaded photos when available, with clickable
 * thumbnails; falls back to a type-based placeholder when there are none.
 */
export function PhotoGallery({
  type,
  photos,
}: {
  type: PropertyType;
  photos: PropertyImage[];
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <PropertyPlaceholder
        type={type}
        label="لا توجد صور"
        className="aspect-[16/10] w-full rounded-xl border border-border"
      />
    );
  }

  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border">
        <Image
          src={current.url}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
          priority
        />
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`الصورة ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 transition-colors",
                i === active
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
