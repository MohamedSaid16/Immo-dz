import { Building2, Home, Landmark, Store, Trees } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PropertyType } from "@/lib/types";

const TYPE_ICON: Record<PropertyType, typeof Home> = {
  apartment: Building2,
  villa: Home,
  commercial: Store,
  land: Trees,
};

/**
 * Placeholder artwork used wherever a real photo would go (no storage yet).
 * The icon reflects the property type so cards stay visually distinguishable.
 */
export function PropertyPlaceholder({
  type,
  className,
  label,
}: {
  type: PropertyType;
  className?: string;
  label?: string;
}) {
  const Icon = TYPE_ICON[type] ?? Landmark;
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#f4f4f4] text-[#777777]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <Icon className="size-10" />
        {label && (
          <span className="text-xs font-medium text-[#777777]">{label}</span>
        )}
      </div>
    </div>
  );
}
