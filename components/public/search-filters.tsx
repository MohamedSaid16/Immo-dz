import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PROPERTY_TYPE_LABELS,
  TRANSACTION_LABELS,
  type PropertyFilters,
  type PropertyType,
  type TransactionType,
} from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

const TYPES = Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][];
const TRANSACTIONS = Object.entries(TRANSACTION_LABELS) as [
  TransactionType,
  string,
][];

/**
 * Filters submit as a plain GET form — no client JS needed, the URL stays
 * shareable, and the server page reads them from `searchParams`.
 */
export function SearchFilters({ filters }: { filters: PropertyFilters }) {
  return (
    <form
      method="get"
      action="/biens"
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal className="size-4 text-primary" />
        Filtres de recherche
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="wilaya">الولاية · Wilaya</Label>
          <Select id="wilaya" name="wilaya" defaultValue={filters.wilaya ?? ""}>
            <option value="">كل الولايات · Toutes</option>
            {WILAYAS.map((w) => (
              <option key={w.code} value={w.name}>
                {w.code} — {w.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">النوع · Type</Label>
          <Select id="type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">كل الأنواع · Tous</option>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transaction">المعاملة · Transaction</Label>
          <Select
            id="transaction"
            name="transaction"
            defaultValue={filters.transaction ?? ""}
          >
            <option value="">الكل · Tous</option>
            {TRANSACTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minPrice">السعر من · Prix min</Label>
          <Input
            id="minPrice"
            name="minPrice"
            type="number"
            min={0}
            dir="ltr"
            placeholder="0"
            defaultValue={filters.minPrice ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maxPrice">السعر إلى · Prix max</Label>
          <Input
            id="maxPrice"
            name="maxPrice"
            type="number"
            min={0}
            dir="ltr"
            placeholder="∞"
            defaultValue={filters.maxPrice ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rooms">الغرف · Pièces</Label>
          <Select id="rooms" name="rooms" defaultValue={filters.rooms ?? ""}>
            <option value="">الكل</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ غرف
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" className="gap-1.5">
          <Search className="size-4" />
          Rechercher
        </Button>
        <Link
          href="/biens"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          إعادة تعيين
        </Link>
      </div>
    </form>
  );
}
