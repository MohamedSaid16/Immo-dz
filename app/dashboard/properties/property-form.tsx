"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  Globe,
  Loader2,
  Save,
  Send,
} from "lucide-react";

import { saveProperty } from "./actions";
import { prepareSocialPublication } from "./social-actions";
import { AmenityPicker } from "@/components/dashboard/amenity-picker";
import { EnergyClassSelect } from "@/components/dashboard/energy-class-select";
import { PhotoUpload } from "@/components/dashboard/photo-upload";
import { PropertyMarketingAssistant } from "@/components/dashboard/property-marketing-assistant";
import {
  getPropertyFormSection,
  PropertyFormTabs,
  type PropertyFormSectionId,
} from "@/components/dashboard/property-form-tabs";
import { PropertySummaryHeader } from "@/components/dashboard/property-summary-header";
import { SocialPublishingSection } from "@/components/dashboard/social-publishing-section";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AMENITIES_OPTIONS,
  FEATURES_OPTIONS,
  NEARBY_PLACES_OPTIONS,
  PROPERTY_TYPE_LABELS,
  STATUS_LABELS,
  TRANSACTION_LABELS,
  type Property,
  type PropertyStatus,
  type PropertyType,
  type TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { WILAYAS } from "@/lib/wilayas";
import type {
  SocialActionResult,
  SocialChannel,
  SocialPublication,
} from "@/lib/social-publishing/contracts";

const PROPERTY_TYPES = Object.entries(PROPERTY_TYPE_LABELS) as [
  PropertyType,
  string,
][];
const TRANSACTIONS = Object.entries(TRANSACTION_LABELS) as [
  TransactionType,
  string,
][];
const STATUSES = Object.entries(STATUS_LABELS) as [
  PropertyStatus,
  { label: string },
][];

/* ------------------------------------------------------------------ */
/*  Tabbed form section                                                */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  activeSection,
  children,
}: {
  id: PropertyFormSectionId;
  title: string;
  activeSection: PropertyFormSectionId;
  children: React.ReactNode;
}) {
  const active = activeSection === id;

  return (
    <section
      id={`property-section-${id}`}
      role="tabpanel"
      aria-labelledby={`property-tab-${id}`}
      hidden={!active}
      tabIndex={-1}
    >
      <Card>
        <CardHeader className="border-b border-border/70 px-4 py-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Property Form                                                      */
/* ------------------------------------------------------------------ */

export function PropertyForm({
  mode,
  property,
  socialPublications = [],
  socialLoadError,
}: {
  mode: "add" | "edit";
  property?: Property;
  socialPublications?: SocialPublication[];
  socialLoadError?: string;
}) {
  const [state, formAction, pending] = useActionState(saveProperty, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [activeSection, setActiveSection] = useState<PropertyFormSectionId>("basic");
  const [invalidSections, setInvalidSections] = useState<Set<PropertyFormSectionId>>(
    () => new Set(),
  );
  const invalidHandled = useRef(false);
  const [socialRows, setSocialRows] = useState<SocialPublication[]>(socialPublications);
  const [socialDrafts, setSocialDrafts] = useState<Record<SocialChannel, string>>(() => ({
    facebook:
      socialPublications.find((publication) => publication.channel === "facebook")
        ?.approvedContent ?? "",
    instagram:
      socialPublications.find((publication) => publication.channel === "instagram")
        ?.approvedContent ?? "",
  }));

  function applyAiField(
    field: "title" | "description" | "title_fr" | "description_fr",
    value: string,
  ): void {
    const element = formRef.current?.elements.namedItem(field);
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return;
    }
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function handleSocialPublicationChange(publication: SocialPublication): void {
    setSocialRows((current) => {
      const withoutCurrent = current.filter((item) => item.channel !== publication.channel);
      return [...withoutCurrent, publication];
    });
    setSocialDrafts((current) => ({
      ...current,
      [publication.channel]: publication.approvedContent,
    }));
  }

  function handleSocialDraftChange(channel: SocialChannel, content: string): void {
    setSocialDrafts((current) => ({ ...current, [channel]: content }));
  }

  async function handlePrepareSocial(
    channel: SocialChannel,
    content: string,
  ): Promise<SocialActionResult> {
    if (!property) {
      return { ok: false, error: "احفظ العقار أولاً قبل تحضير محتوى النشر." };
    }

    const result = await prepareSocialPublication(property.id, channel, content);
    if (result.ok) handleSocialPublicationChange(result.publication);
    return result;
  }

  function handleInvalid(event: React.InvalidEvent<HTMLFormElement>): void {
    if (invalidHandled.current) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const section = getPropertyFormSection(target.name);
    if (!section) return;

    invalidHandled.current = true;
    setActiveSection(section);
    setInvalidSections((current) => new Set(current).add(section));

    window.setTimeout(() => {
      target.focus({ preventScroll: false });
    }, 0);
  }

  function handleInput(): void {
    invalidHandled.current = false;
    setInvalidSections(new Set());
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 pb-24 sm:pb-28"
      onInvalidCapture={handleInvalid}
      onInputCapture={handleInput}
    >
      {property && <input type="hidden" name="id" value={property.id} />}

      {property && <PropertySummaryHeader property={property} />}

      <PropertyFormTabs
        activeSection={activeSection}
        invalidSections={invalidSections}
        onChange={setActiveSection}
      />

      {state?.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      )}

      {/* ============================================================ */}
      {/* 1. Basic Info                                                 */}
      {/* ============================================================ */}
      <Section id="basic" activeSection={activeSection} title="المعلومات الأساسية">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">العنوان بالعربية *</Label>
            <Input
              id="title"
              name="title"
              placeholder="مثال: شقة F4 مع شرفة"
              defaultValue={property?.title}
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title_fr">
              العنوان بالفرنسية
            </Label>
            <Input
              id="title_fr"
              name="title_fr"
              dir="ltr"
              placeholder="Ex: Appartement F4 avec balcon"
              defaultValue={property?.titleFr ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">السعر (دج) *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              dir="ltr"
              placeholder="18500000"
              defaultValue={property?.price}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction">المعاملة *</Label>
              <Select
                id="transaction"
                name="transaction"
                defaultValue={property?.transaction ?? "sale"}
                required
              >
                {TRANSACTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">نوع العقار *</Label>
              <Select
                id="type"
                name="type"
                defaultValue={property?.type ?? "apartment"}
                required
              >
                {PROPERTY_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <div className="space-y-2">
            <Label htmlFor="description">الوصف بالعربية</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="اكتب وصفًا واضحًا للعقار..."
              defaultValue={property?.description}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description_fr">الوصف بالفرنسية</Label>
            <Textarea
              id="description_fr"
              name="description_fr"
              rows={4}
              dir="ltr"
              placeholder="Décrivez le bien en français..."
              defaultValue={property?.descriptionFr ?? ""}
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* 2. Location                                                   */}
      {/* ============================================================ */}
      <Section id="location" activeSection={activeSection} title="الموقع">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wilaya">الولاية *</Label>
            <Select
              id="wilaya"
              name="wilaya"
              defaultValue={property?.wilaya ?? ""}
              required
            >
              <option value="" disabled>
                اختر الولاية
              </option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.name}>
                  {w.code} — {w.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipality">البلدية</Label>
            <Input
              id="municipality"
              name="municipality"
              placeholder="مثال: باب الزوار"
              defaultValue={property?.municipality}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">العنوان التفصيلي</Label>
            <Input
              id="address"
              name="address"
              placeholder="الحي، العمارة، الرقم..."
              defaultValue={property?.address}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">خط العرض</Label>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              dir="ltr"
              placeholder="36.7538"
              defaultValue={property?.latitude ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">خط الطول</Label>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              dir="ltr"
              placeholder="3.0588"
              defaultValue={property?.longitude ?? ""}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            اختياري — إذا تُركت فارغة، يُستخدم مركز الولاية على الخريطة.
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* 3. Details                                                    */}
      {/* ============================================================ */}
      <Section id="details" activeSection={activeSection} title="التفاصيل">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="rooms">عدد الغرف</Label>
            <Input
              id="rooms"
              name="rooms"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={property?.rooms}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bathrooms">عدد الحمامات</Label>
            <Input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={property?.bathrooms}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor">الطابق</Label>
            <Input
              id="floor"
              name="floor"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={property?.floor}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">المساحة (م²)</Label>
            <Input
              id="area"
              name="area"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={property?.area}
            />
          </div>

          {/* New fields */}
          <div className="space-y-2">
            <Label htmlFor="parking_spots">مواقف السيارات</Label>
            <Input
              id="parking_spots"
              name="parking_spots"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={property?.parkingSpots ?? 0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="construction_year">سنة البناء</Label>
            <Input
              id="construction_year"
              name="construction_year"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              dir="ltr"
              placeholder="2020"
              defaultValue={property?.constructionYear ?? ""}
            />
          </div>

          <div className="space-y-2 col-span-2 lg:col-span-4">
            <Label htmlFor="status">الحالة</Label>
            <div className="sm:max-w-xs">
              <Select
                id="status"
                name="status"
                defaultValue={property?.status ?? "available"}
              >
                {STATUSES.map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Energy class */}
          <div className="col-span-2 lg:col-span-4">
            <EnergyClassSelect defaultValue={property?.energyClass} />
          </div>
        </div>

      {/* ============================================================ */}
      {/* 4. Amenities & Features                                       */}
      {/* ============================================================ */}
      <div className="mt-6 space-y-6 border-t border-border pt-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">التجهيزات والمميزات</p>
          <AmenityPicker
            name="amenities"
            label="التجهيزات"
            options={AMENITIES_OPTIONS}
            defaultValue={property?.amenities ?? []}
          />

          <hr className="border-border" />

          <AmenityPicker
            name="features"
            label="مميزات العقار"
            options={FEATURES_OPTIONS}
            defaultValue={property?.features ?? []}
          />

          <hr className="border-border" />

          <AmenityPicker
            name="nearby_places"
            label="أماكن قريبة"
            options={NEARBY_PLACES_OPTIONS}
            defaultValue={property?.nearbyPlaces ?? []}
          />
        </div>
      </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="video_url">رابط الفيديو</Label>
            <Input
              id="video_url"
              name="video_url"
              type="url"
              dir="ltr"
              placeholder="https://youtube.com/watch?v=..."
              defaultValue={property?.videoUrl ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="virtual_tour_url">رابط الجولة الافتراضية</Label>
            <Input
              id="virtual_tour_url"
              name="virtual_tour_url"
              type="url"
              dir="ltr"
              placeholder="https://my.matterport.com/..."
              defaultValue={property?.virtualTourUrl ?? ""}
            />
          </div>
        </div>
      </Section>

      <Section id="marketing" activeSection={activeSection} title="التسويق">
        <div className="space-y-6">
          <PropertyMarketingAssistant
            formRef={formRef}
            onApplyField={applyAiField}
            onPrepareSocial={mode === "edit" && property ? handlePrepareSocial : undefined}
          />

          <SocialPublishingSection
            propertyId={property?.id}
            publications={socialRows}
            drafts={socialDrafts}
            loadError={socialLoadError}
            disabled={mode === "add"}
            onDraftChange={handleSocialDraftChange}
            onPublicationChange={handleSocialPublicationChange}
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* 6. Media                                                      */}
      {/* ============================================================ */}
      <Section id="images" activeSection={activeSection} title="الصور">
        <div className="space-y-6">
          <PhotoUpload
            propertyId={property?.id}
            initialPhotos={property?.photos}
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* 7. Publishing                                                 */}
      {/* ============================================================ */}
      <Section id="publishing" activeSection={activeSection} title="النشر">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                حالة النشر
              </p>
              <p className="text-xs text-muted-foreground">
                المسودات لا تظهر في البحث العام. انشر عند الجاهزية.
              </p>
            </div>
            <div className="flex items-center gap-3">
            <label className="group flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_published"
                value="false"
                defaultChecked={mode === "add" || !property?.isPublished}
                className="peer sr-only"
              />
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-xs font-medium text-muted-foreground transition-all peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background">
                <Save className="size-3.5" />
                مسودة
              </span>
            </label>
            <label className="group flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_published"
                value="true"
                defaultChecked={mode === "edit" && property?.isPublished === true}
                className="peer sr-only"
              />
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-xs font-medium text-muted-foreground transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                <Globe className="size-3.5" />
                منشور
              </span>
            </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================ */}
      {/* Actions                                                       */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 z-20 -mx-2 flex flex-col-reverse gap-2 border-t border-border bg-card/95 px-2 py-2 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-3 sm:py-2.5">
        <Link
          href="/dashboard/properties"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          إلغاء
        </Link>
        <Button type="submit" size="lg" disabled={pending} className="w-full shadow-sm sm:w-auto">
          {pending && <Loader2 className="animate-spin" />}
          <Send className="size-4" />
          {mode === "add" ? "حفظ العقار" : "حفظ التعديلات"}
        </Button>
      </div>
    </form>
  );
}
