"use client";

import { ENERGY_CLASSES, type EnergyClass } from "@/lib/types";

/**
 * Visual energy class selector (A–G) with color-coded badges.
 * Mirrors European DPE style — intuitive for Algerian agencies
 * familiar with French conventions.
 */
export function EnergyClassSelect({
  name = "energy_class",
  defaultValue,
}: {
  name?: string;
  defaultValue?: EnergyClass | null;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        التصنيف الطاقوي · Classe Énergétique
      </p>

      <div className="flex flex-wrap gap-1.5">
        {/* "None" option */}
        <label className="group cursor-pointer">
          <input
            type="radio"
            name={name}
            value=""
            defaultChecked={!defaultValue}
            className="peer sr-only"
          />
          <span className="inline-flex h-9 items-center rounded-md border border-border bg-secondary/50 px-3 text-xs font-medium text-muted-foreground transition-all peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background group-hover:border-foreground/40">
            غير محدد
          </span>
        </label>

        {ENERGY_CLASSES.map(({ value, label, color }) => (
          <label key={value} className="group cursor-pointer">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={defaultValue === value}
              className="peer sr-only"
            />
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-all peer-checked:scale-105 peer-checked:shadow-md group-hover:scale-[1.02]"
              style={{
                borderColor: color,
                color: color,
                backgroundColor: `${color}10`,
              }}
            >
              <span
                className="flex size-5 items-center justify-center rounded text-[11px] font-black text-white"
                style={{ backgroundColor: color }}
              >
                {value}
              </span>
              <span className="hidden sm:inline">{label.split(" — ")[1]}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        اختياري — يُظهر كفاءة العقار الطاقوية للمشتري.
      </p>
    </div>
  );
}
