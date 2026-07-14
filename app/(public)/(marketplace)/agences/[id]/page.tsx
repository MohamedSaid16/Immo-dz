import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, MapPin, Phone } from "lucide-react";

import { PropertyCard, WhatsAppIcon } from "@/components/public/property-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { cn, telHref, waHref } from "@/lib/utils";
import { getAgencyById, getPropertiesByAgency } from "@/lib/properties";
import { getAbsoluteUrl, getAgencyPath } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: PageProps<"/agences/[id]">): Promise<Metadata> {
  const { id } = await params;
  const agency = await getAgencyById(id);
  if (!agency) return { title: "Agence introuvable" };

  const canonicalUrl = getAbsoluteUrl(getAgencyPath(agency.id));
  const description = `عقارات ${agency.name} في ${agency.wilaya}. Découvrez les biens de l'agence ${agency.name}.`;

  return {
    title: agency.name,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: agency.name,
      description,
      url: canonicalUrl,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: agency.name,
      description,
    },
  };
}

export default async function AgencyProfilePage({
  params,
}: PageProps<"/agences/[id]">) {
  const { id } = await params;
  const agency = await getAgencyById(id);

  if (!agency) {
    notFound();
  }

  const properties = await getPropertiesByAgency(agency.id);

  const breadcrumbs = [
    { label: "الوكالات" },
    { label: agency.wilaya },
    { label: agency.name },
  ];

  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": agency.name,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": agency.wilaya,
      "streetAddress": agency.address || undefined,
    },
    "telephone": agency.phone || undefined,
    "url": getAbsoluteUrl(getAgencyPath(agency.id)),
    "description": agency.about || undefined,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
      <JsonLd schema={jsonLdSchema} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Agency header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Cover banner over a gradient fallback (gradient shows if image missing). */}
        <div
          className="h-32 bg-gradient-to-l from-primary/20 via-accent to-secondary bg-cover bg-center sm:h-40"
          style={{ backgroundImage: "url(/images/banner-2.jpg)" }}
        />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="-mt-14 flex size-24 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-primary text-3xl font-extrabold text-primary-foreground shadow-sm">
              {agency.name.charAt(0)}
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {agency.name}
              </h1>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {agency.address}
              </p>
            </div>
          </div>

          {agency.phone && (
            <div className="flex items-center gap-2">
              <a
                href={telHref(agency.phone)}
                className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
              >
                <Phone className="size-4" />
                اتصال
              </a>
              <a
                href={waHref(agency.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
                )}
              >
                <WhatsAppIcon className="size-4" />
                واتساب
              </a>
            </div>
          )}
        </div>

        <div className="grid gap-3 border-t border-border px-6 py-4 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            {agency.wilaya}
          </p>
          <p dir="ltr" className="flex items-center gap-2 text-muted-foreground sm:justify-center">
            <Phone className="size-4 text-primary" />
            {agency.phone}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground sm:justify-end">
            <Building2 className="size-4 text-primary" />
            {properties.length} عقار
          </p>
        </div>
      </div>

      {agency.about && (
        <p className="leading-relaxed text-muted-foreground">{agency.about}</p>
      )}

      {/* Agency properties */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          عقارات الوكالة · Nos biens ({properties.length})
        </h2>
        {properties.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            لا توجد عقارات منشورة حاليًا.
          </div>
        )}
      </section>
    </div>
  );
}
