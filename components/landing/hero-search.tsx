import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PROPERTY_TYPE_LABELS, TRANSACTION_LABELS } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

// Golden-bordered field, 44px tall. Adapts to light/dark via tokens.
const FIELD =
  "h-11 rounded-lg border-primary/40 bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary/60";
const LABEL = "text-xs font-medium text-foreground/70";

/**
 * Landing search — a dedicated dark-navy band directly below the hero (no
 * overlap). Submits as a GET form to /biens so results are shareable.
 */
export function HeroSearch() {
  return (
    <section className="border-y border-border bg-card p-6">
      <div className="mx-auto max-w-6xl">
        <form
          method="get"
          action="/biens"
          dir="ltr"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8 lg:items-end"
        >
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="hs-wilaya" className={LABEL}>
              Wilaya · الولاية
            </Label>
            <Select id="hs-wilaya" name="wilaya" defaultValue="" className={FIELD}>
              <option value="">كل الولايات</option>
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.name}>
                  {w.code} — {w.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hs-type" className={LABEL}>
              Type
            </Label>
            <Select id="hs-type" name="type" defaultValue="" className={FIELD}>
              <option value="">الكل</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hs-transaction" className={LABEL}>
              Transaction
            </Label>
            <Select
              id="hs-transaction"
              name="transaction"
              defaultValue=""
              className={FIELD}
            >
              <option value="">الكل</option>
              {Object.entries(TRANSACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hs-rooms" className={LABEL}>
              Pièces · الغرف
            </Label>
            <Select id="hs-rooms" name="rooms" defaultValue="" className={FIELD}>
              <option value="">الكل</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hs-min" className={LABEL}>
              Budget min
            </Label>
            <Input
              id="hs-min"
              name="minPrice"
              type="number"
              min={0}
              placeholder="0"
              className={FIELD}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hs-max" className={LABEL}>
              Budget max
            </Label>
            <Input
              id="hs-max"
              name="maxPrice"
              type="number"
              min={0}
              placeholder="∞"
              className={FIELD}
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="size-4" />
            Rechercher
          </button>
        </form>
      </div>
    </section>
  );
}
