import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BedDouble,
  Building,
  Calendar,
  Car,
  Layers,
  MapPin,
  Maximize,
  ShowerHead,
  Zap,
} from "lucide-react";

import { ContactActions } from "@/components/public/contact-actions";
import { PhotoGallery } from "@/components/public/photo-gallery";
import { PropertyCard } from "@/components/public/property-card";
import { PropertyShare } from "@/components/public/property-share";
import { PropertyViewTracker } from "@/components/public/property-view-tracker";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDZD } from "@/lib/utils";
import {
  getDirectVideoUrl,
  getVirtualTourEmbedUrl,
  getYouTubeEmbedUrl,
} from "@/lib/embed-url";
import {
  ENERGY_CLASSES,
  PROPERTY_TYPE_LABELS,
  STATUS_LABELS,
  TRANSACTION_LABELS,
} from "@/lib/types";
import {
  getPublishedPropertyByIdentifier,
  getSimilarProperties,
} from "@/lib/properties";
import { getAbsoluteUrl, getPropertyPath, getTransactionWilayaPath } from "@/lib/site-url";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: PageProps<"/biens/[id]">): Promise<Metadata> {
  const { id } = await params;
  const property = await getPublishedPropertyByIdentifier(id);
  if (!property) return { title: "Bien introuvable" };

  const title = `${property.title} — ${property.wilaya}`;
  const description = `${PROPERTY_TYPE_LABELS[property.type]} · ${
    TRANSACTION_LABELS[property.transaction]
  } · ${formatDZD(property.price)} دج — ${property.municipality}، ${property.wilaya}.`;

  const propertyPath = getPropertyPath(property.slug ?? property.id);
  const canonicalUrl = getAbsoluteUrl(propertyPath);

  const ogImageUrl = new URL(getAbsoluteUrl("/api/og/property"));
  ogImageUrl.searchParams.set("title", title);
  ogImageUrl.searchParams.set("price", `${formatDZD(property.price)} دج`);
  ogImageUrl.searchParams.set("wilaya", property.wilaya);
  ogImageUrl.searchParams.set("type", PROPERTY_TYPE_LABELS[property.type]);
  if (property.photos[0]) {
    ogImageUrl.searchParams.set("image", property.photos[0].url);
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function PropertyDetailPage({
  params,
}: PageProps<"/biens/[id]">) {
  const { id } = await params;

  // Try slug first (SEO-friendly), fall back to UUID
  const property = await getPublishedPropertyByIdentifier(id);

  if (!property || !property.isPublished || property.archivedAt) {
    notFound();
  }

  const agency = property.agency;
  const status = STATUS_LABELS[property.status];
  const similar = await getSimilarProperties(property, 3);
  const priceSuffix = property.transaction === "rent" ? " دج/شهر" : " دج";

  const canonicalUrl = getAbsoluteUrl(
    getPropertyPath(property.slug ?? property.id),
  );
  const videoEmbedUrl = property.videoUrl
    ? getYouTubeEmbedUrl(property.videoUrl)
    : null;
  const directVideoUrl = property.videoUrl
    ? getDirectVideoUrl(property.videoUrl)
    : null;
  const virtualTourEmbedUrl = property.virtualTourUrl
    ? getVirtualTourEmbedUrl(property.virtualTourUrl)
    : null;

  const specs = [
    property.rooms > 0 && {
      icon: BedDouble,
      label: "الغرف",
      value: `${property.rooms}`,
    },
    { icon: Maximize, label: "المساحة", value: `${property.area} م²` },
    property.bathrooms > 0 && {
      icon: ShowerHead,
      label: "الحمامات",
      value: `${property.bathrooms}`,
    },
    property.type !== "land" && {
      icon: Layers,
      label: "الطابق",
      value: property.floor === 0 ? "أرضي" : `${property.floor}`,
    },
    {
      icon: Building,
      label: "النوع",
      value: PROPERTY_TYPE_LABELS[property.type],
    },
    property.parkingSpots > 0 && {
      icon: Car,
      label: "مواقف",
      value: `${property.parkingSpots}`,
    },
    property.constructionYear && {
      icon: Calendar,
      label: "سنة البناء",
      value: `${property.constructionYear}`,
    },
  ].filter(Boolean) as { icon: typeof BedDouble; label: string; value: string }[];

  const energyInfo = property.energyClass
    ? ENERGY_CLASSES.find((e) => e.value === property.energyClass)
    : null;

  const breadcrumbs = [
    { label: "البحث", href: "/biens" },
    {
      label: property.wilaya,
      href: getTransactionWilayaPath(
        property.transaction === "sale" ? "vente" : "location",
        property.wilaya,
      ),
    },
    { label: property.title },
  ];

  const jsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.title,
    "description": property.description || property.title,
    "url": canonicalUrl,
    "datePosted": property.createdAt,
    "image": property.photos.map(p => p.url),
    "offers": {
      "@type": "Offer",
      "price": property.price,
      "priceCurrency": "DZD",
      "businessFunction": property.transaction === "sale" ? "http://purl.org/goodrelations/v1#Sell" : "http://purl.org/goodrelations/v1#LeaseOut"
    },
    "about": {
      "@type": "Residence",
      "numberOfRooms": property.rooms || undefined,
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": property.area,
        "unitCode": "MTK"
      }
    }
  };

  return (
    <div className="mx-auto max-w-[1560px] space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <PropertyViewTracker propertyId={property.id} />
      <JsonLd schema={jsonLdSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Main column */}
        <div className="space-y-8">
          <PhotoGallery type={property.type} photos={property.photos} />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-none bg-[#111111] text-white">
                {TRANSACTION_LABELS[property.transaction]}
              </Badge>
              <Badge variant={status.variant} className="rounded-none">{status.label}</Badge>
              <Badge variant="outline" className="rounded-none">
                {PROPERTY_TYPE_LABELS[property.type]}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {property.title}
              </h1>
              {property.titleFr && (
                <p dir="ltr" className="mt-0.5 text-base text-muted-foreground">
                  {property.titleFr}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4" />
                {property.address}، {property.municipality}، {property.wilaya}
              </p>
            </div>

            <p className="text-3xl font-semibold tabular-nums text-[#111111]">
              {formatDZD(property.price)}
              <span className="text-base font-medium text-muted-foreground">
                {priceSuffix}
              </span>
            </p>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {specs.map((spec) => (
              <div
                key={spec.label}
                className="flex flex-col items-center gap-1 border border-border bg-white p-3 text-center"
              >
                <spec.icon className="size-5 text-[#111111]" />
                <span className="text-sm font-semibold text-foreground">
                  {spec.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {spec.label}
                </span>
              </div>
            ))}
          </div>

          {/* Energy class */}
          {energyInfo && (
            <div className="flex items-center gap-3 border border-border bg-[#f4f4f4] p-4">
              <Zap className="size-5 text-[#111111]" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  التصنيف الطاقوي:
                </span>
                <span
                  className="inline-flex size-7 items-center justify-center rounded text-xs font-black text-white"
                  style={{ backgroundColor: energyInfo.color }}
                >
                  {energyInfo.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {energyInfo.label}
                </span>
              </div>
            </div>
          )}

          {/* Amenities / Features / Nearby */}
          {(property.amenities.length > 0 ||
            property.features.length > 0 ||
            property.nearbyPlaces.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {property.amenities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    المرافق · Équipements
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((a) => (
                      <span
                        key={a}
                        className="border border-border bg-white px-2.5 py-1 text-xs text-foreground"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {property.features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    مميزات · Caractéristiques
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((f) => (
                      <span
                        key={f}
                        className="border border-border bg-white px-2.5 py-1 text-xs text-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {property.nearbyPlaces.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    أماكن قريبة · À proximité
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.nearbyPlaces.map((n) => (
                      <span
                        key={n}
                        className="border border-border bg-white px-2.5 py-1 text-xs text-foreground"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold">الوصف · Description</h2>
            {property.description && (
              <p className="leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            )}
            {property.descriptionFr && (
              <p dir="ltr" className="mt-2 leading-relaxed text-muted-foreground">
                {property.descriptionFr}
              </p>
            )}
          </div>

          {/* Video */}
          {(videoEmbedUrl || directVideoUrl) && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold">فيديو · Vidéo</h2>
              <div className="overflow-hidden rounded-lg border border-border">
                {videoEmbedUrl ? (
                  <iframe
                    src={videoEmbedUrl}
                    className="aspect-video w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title="فيديو العقار"
                  />
                ) : (
                  <video
                    src={directVideoUrl ?? undefined}
                    controls
                    className="aspect-video w-full"
                  />
                )}
              </div>
            </div>
          )}

          {/* Virtual tour */}
          {virtualTourEmbedUrl && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold">
                جولة افتراضية · Visite virtuelle
              </h2>
              <div className="overflow-hidden rounded-lg border border-border">
                <iframe
                  src={virtualTourEmbedUrl}
                  className="aspect-video w-full"
                  allowFullScreen
                  allow="fullscreen; xr-spatial-tracking"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="جولة افتراضية"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold">الموقع · Localisation</h2>
            <div className="flex items-start gap-2 border border-border bg-[#f4f4f4] p-4 text-sm">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[#111111]" />
              <div>
                <p className="font-medium text-foreground">{property.address}</p>
                <p className="text-muted-foreground">
                  {property.municipality}، {property.wilaya}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — contact + agency */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ContactActions
            propertyId={property.id}
            agencyId={property.agencyId}
            agencyPhone={agency?.phone ?? null}
            propertyTitle={property.title}
          />
          
          <PropertyShare
            propertyId={property.id}
            agencyId={property.agencyId}
            propertyTitle={property.title}
            canonicalUrl={canonicalUrl}
          />

          {agency && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  الوكالة
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-sm bg-[#111111] text-lg font-bold text-white">
                    {agency.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      {agency.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agency.wilaya}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/agences/${agency.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full",
                  )}
                >
                  عرض صفحة الوكالة
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* Similar properties */}
      {similar.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">عقارات مشابهة · Biens similaires</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
