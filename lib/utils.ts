import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("ar-DZ", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Arabic relative time, e.g. "قبل ٣ أيام". Falls back to a date for old items. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

  const min = Math.round(diffMs / 60000);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(diffMs / 3600000);
  if (Math.abs(hr) < 24) return rtf.format(hr, "hour");
  const day = Math.round(diffMs / 86400000);
  if (Math.abs(day) < 30) return rtf.format(day, "day");
  const mon = Math.round(day / 30);
  if (Math.abs(mon) < 12) return rtf.format(mon, "month");
  return rtf.format(Math.round(day / 365), "year");
}

/** Digits only, for a `tel:` href. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Build a wa.me link. Algerian local numbers (leading 0) are converted to the
 * international 213 format.
 */
export function waHref(phone: string, text?: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `213${digits.slice(1)}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/* ------------------------------------------------------------------ */
/*  Slug generation                                                    */
/* ------------------------------------------------------------------ */

const AR_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j",
  ح: "h", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q",
  ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ة: "a",
  ى: "a", ئ: "y", ؤ: "w",
};

/**
 * Generate a URL-friendly slug from an Arabic/French/English title.
 * Transliterates Arabic letters, lowercases Latin chars, strips
 * everything else, and appends a 4-char random suffix for uniqueness.
 */
export function slugify(title: string): string {
  let slug = "";
  for (const ch of title) {
    if (AR_TO_LATIN[ch]) {
      slug += AR_TO_LATIN[ch];
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      slug += ch.toLowerCase();
    } else if (/[\s\-_]/.test(ch)) {
      slug += "-";
    }
    // skip diacritics and other special chars
  }

  slug = slug
    .replace(/-+/g, "-")   // collapse multiple dashes
    .replace(/^-|-$/g, "") // trim leading/trailing dashes
    .slice(0, 80);         // cap length

  // Append random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : suffix;
}
