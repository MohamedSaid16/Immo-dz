import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS, type PropertyFilters, type PropertyType, type TransactionType } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

const TYPES = Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][];
const TRANSACTIONS = Object.entries(TRANSACTION_LABELS) as [TransactionType, string][];
const fieldClass = "h-10 rounded-[2px] border-[#dadada] bg-white text-[#111111] shadow-none focus-visible:border-[#111111] focus-visible:ring-[#111111]/15";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label htmlFor={id} className="text-xs font-semibold text-[#4a4a4a]">{label}</Label>{children}</div>; }

export function SearchFilters({ filters }: { filters: PropertyFilters }) {
  return <form method="get" action="/biens" dir="rtl" className="border border-[#e5e5e5] bg-white p-4 sm:p-5"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center bg-[#f4f4f4] text-[#111111]"><SlidersHorizontal className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-[#111111]">ابحث عن عقارك</p><p className="text-xs text-[#777777]">خيارات بحث دقيقة حسب احتياجك</p></div></div><Link href="/biens" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs text-[#111111]")}>إعادة تعيين</Link></div><details open className="group"><summary className="flex cursor-pointer list-none items-center justify-between border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#111111] [&::-webkit-details-marker]:hidden"><span>خيارات البحث المتقدمة</span><span className="text-[#777777] transition-transform group-open:rotate-180">⌄</span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><FilterFields filters={filters} /><Button type="submit" className="h-10 w-full gap-2 rounded-[2px] bg-[#111111] text-white hover:bg-[#333333] sm:col-span-2 lg:col-span-1"><Search className="size-4" aria-hidden="true" />بحث</Button></div></details></form>;
}

function FilterFields({ filters }: { filters: PropertyFilters }) {
  return <>
    <Field id="transaction" label="نوع العملية"><Select id="transaction" name="transaction" defaultValue={filters.transaction ?? ""} className={fieldClass}><option value="">كل العمليات</option>{TRANSACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
    <Field id="type" label="نوع العقار"><Select id="type" name="type" defaultValue={filters.type ?? ""} className={fieldClass}><option value="">كل الأنواع</option>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
    <Field id="wilaya" label="الولاية"><Select id="wilaya" name="wilaya" defaultValue={filters.wilaya ?? ""} className={fieldClass}><option value="">كل الولايات</option>{WILAYAS.map((w) => <option key={w.code} value={w.name}>{w.code} — {w.name}</option>)}</Select></Field>
    <Field id="municipality" label="البلدية"><Input id="municipality" name="municipality" defaultValue={filters.municipality ?? ""} placeholder="مثال: باب الزوار" className={fieldClass} /></Field>
    <Field id="minPrice" label="السعر الأدنى"><Input id="minPrice" name="minPrice" type="number" min={0} dir="ltr" defaultValue={filters.minPrice ?? ""} placeholder="0" className={fieldClass} /></Field>
    <Field id="maxPrice" label="السعر الأقصى"><Input id="maxPrice" name="maxPrice" type="number" min={0} dir="ltr" defaultValue={filters.maxPrice ?? ""} placeholder="∞" className={fieldClass} /></Field>
    <Field id="minArea" label="المساحة من (م²)"><Input id="minArea" name="minArea" type="number" min={0} dir="ltr" defaultValue={filters.minArea ?? ""} placeholder="0" className={fieldClass} /></Field>
    <Field id="maxArea" label="المساحة إلى (م²)"><Input id="maxArea" name="maxArea" type="number" min={0} dir="ltr" defaultValue={filters.maxArea ?? ""} placeholder="∞" className={fieldClass} /></Field>
    <Field id="rooms" label="عدد الغرف (على الأقل)"><Select id="rooms" name="rooms" defaultValue={filters.rooms ?? ""} className={fieldClass}><option value="">كل الغرف</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ غرف</option>)}</Select></Field>
  </>;
}
