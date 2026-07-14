import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { ResultsToggle } from "@/components/public/results-toggle";
import { SearchFilters } from "@/components/public/search-filters";

export const metadata: Metadata = {
  title: "Recherche de biens",
  description:
    "Recherchez des biens immobiliers en Algérie par wilaya, type, budget et transaction. البحث عن العقارات حسب الولاية والنوع والسعر.",
  alternates: { canonical: "/biens" },
};
import {
  PROPERTY_TYPE_LABELS,
  type PropertyFilters,
  type PropertyType,
  type TransactionType,
} from "@/lib/types";
import { searchProperties } from "@/lib/properties";

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function num(value: string | string[] | undefined): number | undefined {
  const v = one(value);
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const VALID_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];

export default async function BiensPage({
  searchParams,
}: PageProps<"/biens">) {
  const sp = await searchParams;

  const typeRaw = one(sp.type);
  const transactionRaw = one(sp.transaction);

  const filters: PropertyFilters = {
    wilaya: one(sp.wilaya),
    type: VALID_TYPES.includes(typeRaw as PropertyType)
      ? (typeRaw as PropertyType)
      : undefined,
    transaction:
      transactionRaw === "sale" || transactionRaw === "rent"
        ? (transactionRaw as TransactionType)
        : undefined,
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    rooms: num(sp.rooms),
  };

  const results = await searchProperties(filters);
  const countLabel = `${results.length} ${
    results.length === 1 ? "bien trouvé" : "biens trouvés"
  }${filters.wilaya ? ` à ${filters.wilaya}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Trouvez votre bien · ابحث عن عقارك
        </h1>
        <p className="text-sm text-muted-foreground">
          Parcourez les annonces des meilleures agences en Algérie.
        </p>
      </div>

      <SearchFilters filters={filters} />

      <p className="text-sm font-medium text-muted-foreground">{countLabel}</p>

      {results.length > 0 ? (
        <ResultsToggle properties={results} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <SearchX className="size-7" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              Aucun bien ne correspond · لا توجد نتائج
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              جرّب توسيع نطاق البحث أو إعادة تعيين الفلاتر.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
