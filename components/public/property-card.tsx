import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Maximize, Phone } from "lucide-react";

import { PropertyPlaceholder } from "./property-placeholder";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDZD, telHref, waHref } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS, type Property } from "@/lib/types";

function WhatsAppIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /></svg>;
}

function Marker({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-[#333333]"><span className="size-2 shrink-0 bg-[#b5121b]" aria-hidden="true" />{children}</span>;
}

export function PropertyCard({ property, showContact = true }: { property: Property; showContact?: boolean }) {
  const agency = property.agency;
  const priceSuffix = property.transaction === "rent" ? " دج/شهري" : " دج";
  const message = `مرحباً، أنا مهتم بالعقار "${property.title}" (${property.id}).`;
  const location = property.municipality || property.wilaya;

  return (
    <article className="group border-b border-[#e5e5e5] pb-5" dir="rtl">
      <Link href={`/biens/${property.slug ?? property.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-[#f4f4f4]">
          {property.photos[0] ? <Image src={property.photos[0].url} alt={property.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /> : <PropertyPlaceholder type={property.type} className="absolute inset-0" />}
        </div>
        <div className="pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="line-clamp-1 text-lg font-semibold leading-tight text-[#111111]">{location}</h3>
            <p className="shrink-0 text-lg font-semibold tabular-nums text-[#111111]">{formatDZD(property.price)}<span className="ms-1 text-xs font-normal text-[#777777]">{priceSuffix}</span></p>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-[#4a4a4a]">{property.title}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Marker>{property.wilaya}{property.municipality ? ` / ${property.municipality}` : ""}</Marker>
            <Marker>{TRANSACTION_LABELS[property.transaction]}</Marker>
            <Marker>{PROPERTY_TYPE_LABELS[property.type]}</Marker>
          </div>
          <div className="mt-4 grid grid-cols-3 border-t border-[#e5e5e5] bg-[#f4f4f4] py-3 text-center">
            <div className="flex flex-col items-center gap-1 border-l border-[#e5e5e5] text-[#333333]"><Maximize className="size-4" aria-hidden="true" /><span className="text-xs">{property.area} م²</span><span className="text-[10px] text-[#777777]">المساحة</span></div>
            {property.rooms > 0 ? <div className="flex flex-col items-center gap-1 border-l border-[#e5e5e5] text-[#333333]"><BedDouble className="size-4" aria-hidden="true" /><span className="text-xs">{property.rooms}</span><span className="text-[10px] text-[#777777]">الغرف</span></div> : <div />}
            {property.bathrooms > 0 ? <div className="flex flex-col items-center gap-1 text-[#333333]"><Bath className="size-4" aria-hidden="true" /><span className="text-xs">{property.bathrooms}</span><span className="text-[10px] text-[#777777]">الحمامات</span></div> : <div />}
          </div>
        </div>
      </Link>
      {showContact && agency?.phone && <div className="flex items-center justify-between gap-2 pt-3"><span className="truncate text-xs text-[#777777]">{agency.name}</span><div className="flex items-center gap-1.5"><a href={telHref(agency.phone)} aria-label="اتصال بالوكالة" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "size-8 p-0 text-[#111111]")}><Phone className="size-4" aria-hidden="true" /></a><a href={waHref(agency.phone, message)} target="_blank" rel="noopener noreferrer" aria-label="واتساب الوكالة" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "size-8 p-0 text-emerald-600")}><WhatsAppIcon className="size-4" /></a></div></div>}
    </article>
  );
}

export { WhatsAppIcon };
