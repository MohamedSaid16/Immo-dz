"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

export const PROPERTY_FORM_SECTIONS = [
  { id: "basic", label: "المعلومات الأساسية" },
  { id: "location", label: "الموقع" },
  { id: "details", label: "التفاصيل" },
  { id: "images", label: "الصور" },
  { id: "marketing", label: "التسويق" },
  { id: "publishing", label: "النشر" },
] as const;

export type PropertyFormSectionId = (typeof PROPERTY_FORM_SECTIONS)[number]["id"];

const SECTION_IDS = PROPERTY_FORM_SECTIONS.map((section) => section.id);

const FIELD_SECTION_MAP: Record<string, PropertyFormSectionId> = {
  title: "basic",
  title_fr: "basic",
  price: "basic",
  transaction: "basic",
  type: "basic",
  description: "basic",
  description_fr: "basic",
  wilaya: "location",
  municipality: "location",
  address: "location",
  latitude: "location",
  longitude: "location",
  rooms: "details",
  bathrooms: "details",
  floor: "details",
  area: "details",
  parking_spots: "details",
  construction_year: "details",
  status: "details",
  energy_class: "details",
  amenities: "details",
  features: "details",
  nearby_places: "details",
  video_url: "details",
  virtual_tour_url: "details",
  is_published: "publishing",
};

export function getPropertyFormSection(
  fieldName: string,
): PropertyFormSectionId | null {
  return FIELD_SECTION_MAP[fieldName] ?? null;
}

export function PropertyFormTabs({
  activeSection,
  invalidSections,
  onChange,
}: {
  activeSection: PropertyFormSectionId;
  invalidSections: ReadonlySet<PropertyFormSectionId>;
  onChange: (section: PropertyFormSectionId) => void;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusSection(index: number): void {
    const nextIndex = (index + SECTION_IDS.length) % SECTION_IDS.length;
    const nextSection = SECTION_IDS[nextIndex];
    onChange(nextSection);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusSection(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusSection(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusSection(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusSection(SECTION_IDS.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="أقسام نموذج العقار"
      className="-mx-1 overflow-x-auto border-b border-border px-1"
    >
      <div className="flex min-w-max gap-5">
        {PROPERTY_FORM_SECTIONS.map((section, index) => {
          const active = activeSection === section.id;
          const invalid = invalidSections.has(section.id);

          return (
            <button
              key={section.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`property-tab-${section.id}`}
              aria-selected={active}
              aria-controls={`property-section-${section.id}`}
              onClick={() => onChange(section.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "relative inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-0.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:transition-transform",
                active
                  ? "text-foreground after:scale-x-100 after:bg-primary"
                  : "text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-50",
              )}
            >
              {section.label}
              {invalid && (
                <span
                  aria-label="يحتاج إلى مراجعة"
                  className="inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                >
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
