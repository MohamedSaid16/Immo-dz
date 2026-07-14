"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * Chip-style multi-select for amenities, features, and nearby places.
 * Selected values are stored in a hidden input as JSON array.
 */
export function AmenityPicker({
  name,
  label,
  options,
  defaultValue = [],
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [custom, setCustom] = useState("");

  function toggle(option: string) {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((v) => v !== option)
        : [...prev, option],
    );
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setCustom("");
  }

  function removeTag(tag: string) {
    setSelected((prev) => prev.filter((v) => v !== tag));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>

      {/* Hidden input carries the JSON value */}
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {/* Predefined chips */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Selected custom tags */}
      {selected.filter((v) => !options.includes(v)).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected
            .filter((v) => !options.includes(v))
            .map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="أضف عنصرًا مخصصًا..."
          className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Plus className="size-3" />
          إضافة
        </button>
      </div>

      {selected.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {selected.length} عنصر محدد
        </p>
      )}
    </div>
  );
}
