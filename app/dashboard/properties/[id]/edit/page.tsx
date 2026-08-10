import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PropertyForm } from "../../property-form";
import { getCurrentAgencyId, getPropertyById } from "@/lib/properties";
import type { SocialPublication } from "@/lib/social-publishing/contracts";
import { getSocialPublications } from "@/lib/social-publishing/repository";

export default async function EditPropertyPage({
  params,
}: PageProps<"/dashboard/properties/[id]/edit">) {
  const { id } = await params;
  const [property, agencyId] = await Promise.all([
    getPropertyById(id),
    getCurrentAgencyId(),
  ]);

  if (!property || !agencyId || property.agencyId !== agencyId) {
    notFound();
  }

  let socialPublications: SocialPublication[] = [];
  let socialLoadError: string | undefined;
  try {
    socialPublications = await getSocialPublications(id, agencyId);
  } catch {
    socialLoadError = "تعذّر تحميل إعدادات النشر الاجتماعي. طبّق migration 009 ثم أعد المحاولة.";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          العودة إلى العقارات
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">تعديل العقار</h1>
        <p className="text-sm text-muted-foreground">
          {property.title} · {property.id}
        </p>
      </div>

      <PropertyForm
        mode="edit"
        property={property}
        socialPublications={socialPublications}
        socialLoadError={socialLoadError}
      />
    </div>
  );
}
