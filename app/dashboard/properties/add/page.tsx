import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PropertyForm } from "../property-form";

export default function AddPropertyPage() {
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
        <h1 className="text-2xl font-extrabold tracking-tight">إضافة عقار</h1>
        <p className="text-sm text-muted-foreground">
          أدخل تفاصيل العقار الجديد. الحقول المعلّمة بـ * مطلوبة.
        </p>
      </div>

      <PropertyForm mode="add" />
    </div>
  );
}
