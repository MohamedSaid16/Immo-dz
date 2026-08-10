import { Building2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import {
  TRANSACTION_LABELS,
  type Property,
} from "@/lib/types";
import { formatDZD } from "@/lib/utils";

export function PropertySummaryHeader({ property }: { property: Property }) {
  const cover = property.photos.find((photo) => photo.isCover) ?? property.photos[0];
  const status = property.archivedAt
      ? { label: "مؤرشف", variant: "muted" as const }
    : property.isPublished
      ? { label: "منشور", variant: "success" as const }
      : { label: "مسودة", variant: "muted" as const };

  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary sm:size-16">
          {cover ? (
            <Image
              src={cover.thumbnailUrl ?? cover.url}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <Building2 className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
              {property.title}
            </h2>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {formatDZD(property.price)} دج
            </span>
            <span>{TRANSACTION_LABELS[property.transaction]}</span>
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="size-3.5" />
              {property.images} صور
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
