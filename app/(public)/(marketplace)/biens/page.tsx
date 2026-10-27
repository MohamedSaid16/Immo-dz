import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { ResultsToggle } from "@/components/public/results-toggle";
import { SearchFilters } from "@/components/public/search-filters";
import { PROPERTY_TYPE_LABELS, type PropertyFilters, type PropertyType, type TransactionType } from "@/lib/types";
import { searchProperties } from "@/lib/properties";

export const metadata: Metadata = { title: "كتالوج العقارات", description: "تصفح العقارات للبيع والإيجار في الجزائر.", alternates: { canonical: "/biens" } };

function one(value: string | string[] | undefined): string | undefined { const v = Array.isArray(value) ? value[0] : value; return v && v.trim() ? v.trim() : undefined; }
function num(value: string | string[] | undefined): number | undefined { const v = one(value); if (v == null) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }

const VALID_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];

export default async function BiensPage({ searchParams }: PageProps<"/biens">) {
  const sp = await searchParams;
  const typeRaw = one(sp.type);
  const transactionRaw = one(sp.transaction);
  const filters: PropertyFilters = {
    wilaya: one(sp.wilaya), municipality: one(sp.municipality),
    type: VALID_TYPES.includes(typeRaw as PropertyType) ? typeRaw as PropertyType : undefined,
    transaction: transactionRaw === "sale" || transactionRaw === "rent" ? transactionRaw as TransactionType : undefined,
    minPrice: num(sp.minPrice), maxPrice: num(sp.maxPrice), minArea: num(sp.minArea), maxArea: num(sp.maxArea), rooms: num(sp.rooms),
  };
  const results = await searchProperties(filters);
  const countLabel = `${results.length} ${results.length === 1 ? "عقار" : "عقارات"}${filters.wilaya ? ` في ${filters.wilaya}` : ""}`;

  return <div className="mx-auto max-w-[1560px] space-y-8 px-4 py-8 sm:px-6 lg:py-12" dir="rtl">
    <header className="space-y-2"><p className="text-sm font-semibold text-[#b5121b]">كتالوج العقارات</p><h1 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">اكتشف عقارك القادم</h1><p className="max-w-2xl text-sm leading-relaxed text-[#777777]">تصفح عقارات منشورة من وكالات عقارية في مختلف ولايات الجزائر.</p></header>
    <SearchFilters filters={filters} />
    <div className="flex items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3"><p className="text-sm font-semibold text-[#4a4a4a]">{countLabel}</p><span className="hidden text-xs text-[#777777] sm:inline">عروض منشورة من وكالات موثوقة</span></div>
    {results.length > 0 ? <ResultsToggle properties={results} /> : <div className="flex flex-col items-center gap-3 border-y border-[#e5e5e5] py-16 text-center"><span className="flex size-12 items-center justify-center bg-[#f4f4f4] text-[#777777]"><SearchX className="size-6" /></span><div><p className="font-semibold text-[#111111]">لا توجد نتائج مطابقة</p><p className="mt-1 text-sm text-[#777777]">جرّب توسيع نطاق البحث أو إعادة ضبط الفلاتر.</p></div></div>}
  </div>;
}
