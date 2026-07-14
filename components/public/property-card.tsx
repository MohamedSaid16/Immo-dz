import Image from "next/image";
import Link from "next/link";
import { BedDouble, MapPin, Maximize, Phone } from "lucide-react";

import { PropertyPlaceholder } from "./property-placeholder";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDZD, telHref, waHref } from "@/lib/utils";
import {
  PROPERTY_TYPE_LABELS,
  STATUS_LABELS,
  TRANSACTION_LABELS,
  type Property,
} from "@/lib/types";

// WhatsApp glyph (lucide has no brand icon).
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z" />
    </svg>
  );
}

export function PropertyCard({ property }: { property: Property }) {
  const agency = property.agency;
  const status = STATUS_LABELS[property.status];
  const priceSuffix = property.transaction === "rent" ? " دج/شهر" : " دج";
  const message = `مرحبًا، أنا مهتم بالعقار "${property.title}" (${property.id}).`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/biens/${property.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3]">
          {property.photos[0] ? (
            <Image
              src={property.photos[0].url}
              alt={property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <PropertyPlaceholder
              type={property.type}
              className="absolute inset-0"
            />
          )}
          <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
            {TRANSACTION_LABELS[property.transaction]}
          </span>
          <span className="absolute left-3 top-3">
            <Badge variant={status.variant}>{status.label}</Badge>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words font-semibold leading-tight text-foreground">
              {property.title}
            </h3>
            <Badge variant="outline" className="shrink-0">
              {PROPERTY_TYPE_LABELS[property.type]}
            </Badge>
          </div>

          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            {property.municipality}، {property.wilaya}
          </p>

          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {property.rooms > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="size-4" />
                {property.rooms} غرف
              </span>
            )}
            <span className="flex items-center gap-1">
              <Maximize className="size-4" />
              {property.area} م²
            </span>
          </div>

          <p className="mt-auto pt-2 text-lg font-extrabold tabular-nums text-primary">
            {formatDZD(property.price)}
            <span className="text-sm font-medium text-muted-foreground">
              {priceSuffix}
            </span>
          </p>
        </div>
      </Link>

      {agency?.phone && (
        <div className="flex items-center gap-2 border-t border-border p-3">
          <a
            href={telHref(agency.phone)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "flex-1 gap-1.5",
            )}
          >
            <Phone className="size-4" />
            اتصال
          </a>
          <a
            href={waHref(agency.phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "flex-1 gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
            )}
          >
            <WhatsAppIcon className="size-4" />
            واتساب
          </a>
        </div>
      )}
    </article>
  );
}

export { WhatsAppIcon };
