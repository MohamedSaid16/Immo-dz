import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

const FIELD = "h-11 rounded-lg border-white/20 bg-white/10 text-white shadow-none backdrop-blur placeholder:text-white/55 focus-visible:border-white focus-visible:ring-white/30";

export function HeroSearch() {
  return (
    <section className="relative z-10 -mt-20 px-4 pb-10 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-[#111827]/90 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 text-white">
          <div>
            <p className="text-lg font-bold">ابحث عن عقارك القادم</p>
            <p className="text-xs text-white/60">خيارات واضحة للوصول إلى العقار المناسب بسرعة</p>
          </div>
          <span className="hidden rounded-full border border-white/40 px-3 py-1 text-xs text-white/80 sm:inline-flex">
            بيع وإيجار
          </span>
        </div>
        <form method="get" action="/biens" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="hs-transaction" className="text-xs text-white/70">نوع العملية</Label>
            <Select id="hs-transaction" name="transaction" defaultValue="" className={FIELD}>
              <option value="">كل العمليات</option>
              {Object.entries(TRANSACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-type" className="text-xs text-white/70">نوع العقار</Label>
            <Select id="hs-type" name="type" defaultValue="" className={FIELD}>
              <option value="">كل الأنواع</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-wilaya" className="text-xs text-white/70">الولاية</Label>
            <Select id="hs-wilaya" name="wilaya" defaultValue="" className={FIELD}>
              <option value="">كل الولايات</option>
              {WILAYAS.map((w) => <option key={w.code} value={w.name}>{w.code} — {w.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-municipality" className="text-xs text-white/70">البلدية</Label>
            <Input id="hs-municipality" name="municipality" placeholder="مثال: وهران" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-min-price" className="text-xs text-white/70">السعر الأدنى</Label>
            <Input id="hs-min-price" name="minPrice" type="number" min={0} dir="ltr" placeholder="0" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-max-price" className="text-xs text-white/70">السعر الأقصى</Label>
            <Input id="hs-max-price" name="maxPrice" type="number" min={0} dir="ltr" placeholder="∞" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-min-area" className="text-xs text-white/70">المساحة الأدنى (م²)</Label>
            <Input id="hs-min-area" name="minArea" type="number" min={0} dir="ltr" placeholder="0" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-max-area" className="text-xs text-white/70">المساحة القصوى (م²)</Label>
            <Input id="hs-max-area" name="maxArea" type="number" min={0} dir="ltr" placeholder="∞" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hs-rooms" className="text-xs text-white/70">الغرف</Label>
            <div className="flex gap-2">
              <Select id="hs-rooms" name="rooms" defaultValue="" className={`${FIELD} flex-1`}>
                <option value="">كل الغرف</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ غرف</option>)}
              </Select>
              <button type="submit" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#111111] px-5 text-sm font-bold text-white transition-colors hover:bg-[#333333]">
                <Search className="size-4" aria-hidden="true" />
                بحث
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
