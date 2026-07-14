import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BedDouble,
  Building,
  Car,
  Calendar,
  Layers,
  MapPin,
  Maximize,
  ShowerHead,
  Zap,
} from "lucide-react";

import { PhotoGallery } from "@/components/public/photo-gallery";
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
import { getCurrentAgencyId, getPropertyById } from "@/lib/properties";

export default async function PropertyPreviewPage({
  params,
}: PageProps<"/dashboard/properties/[id]/preview">) {
  const { id } = await params;
  const [property, agencyId] = await Promise.all([
    getPropertyById(id),
    getCurrentAgencyId(),
  ]);

  if (!property || !agencyId || property.agencyId !== agencyId) {
    notFound();
  }

  const status = STATUS_LABELS[property.status];
  const priceSuffix = property.transaction === "rent" ? " دج/شهر" : " دج";
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Preview banner */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-primary" />
          <p className="text-sm font-semibold text-primary">
            هذا معاينة — لن يراها الزوار حتى تنشر العقار
          </p>
        </div>
        <Link
          href={`/dashboard/properties/${property.id}/edit`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1",
          )}
        >
          <ArrowRight className="size-3.5" />
          العودة للتعديل
        </Link>
      </div>

      {/* Gallery */}
      <PhotoGallery type={property.type} photos={property.photos} />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">
            {TRANSACTION_LABELS[property.transaction]}
          </Badge>
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="outline">
            {PROPERTY_TYPE_LABELS[property.type]}
          </Badge>
          {!property.isPublished && (
            <Badge variant="warning">مسودة</Badge>
          )}
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

        <p className="text-3xl font-extrabold tabular-nums text-primary">
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
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center"
          >
            <spec.icon className="size-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {spec.value}
            </span>
            <span className="text-xs text-muted-foreground">{spec.label}</span>
          </div>
        ))}
      </div>

      {/* Energy class */}
      {energyInfo && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Zap className="size-5 text-primary" />
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {property.amenities.length > 0 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-semibold text-foreground">
                المرافق · Équipements
              </p>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {property.features.length > 0 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-semibold text-foreground">
                مميزات · Caractéristiques
              </p>
              <div className="flex flex-wrap gap-2">
                {property.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {property.nearbyPlaces.length > 0 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-semibold text-foreground">
                أماكن قريبة · À proximité
              </p>
              <div className="flex flex-wrap gap-2">
                {property.nearbyPlaces.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">الوصف · Description</h2>
        {property.description && (
          <p className="leading-relaxed text-muted-foreground">
            {property.description}
          </p>
        )}
        {property.descriptionFr && (
          <p dir="ltr" className="leading-relaxed text-muted-foreground">
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
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-4 text-sm">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">{property.address}</p>
            <p className="text-muted-foreground">
              {property.municipality}، {property.wilaya}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
