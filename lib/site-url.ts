const LOCAL_DEVELOPMENT_SITE_URL = "http://localhost:3000";
const PROPERTY_PHOTO_BUCKET = "property-photos";

/**
 * The single source of truth for the application's public origin.
 *
 * Keep absolute URL construction here so metadata, structured data, sharing,
 * and crawler endpoints cannot drift onto different origins.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const candidate =
    configured ||
    (process.env.NODE_ENV === "development"
      ? LOCAL_DEVELOPMENT_SITE_URL
      : null);

  if (!candidate) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be configured outside local development.",
    );
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  return url.toString().replace(/\/$/, "");
}

/** Build an absolute public URL without duplicating slash/origin handling. */
export function getAbsoluteUrl(pathname = "/"): string {
  const base = `${getSiteUrl()}/`;
  const relativePath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");
  return new URL(relativePath, base).toString();
}

/** Validate the configured public Supabase origin in one shared location. */
export function getSupabaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be configured.");
  }

  const url = new URL(configured);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use http or https.");
  }
  return url.toString().replace(/\/$/, "");
}

export function getPropertyPhotoUrl(key: string): string {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${getSupabaseUrl()}/storage/v1/object/public/${PROPERTY_PHOTO_BUCKET}/${encodedKey}`;
}

export function getPropertyPhotoKey(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    if (url.origin !== new URL(getSupabaseUrl()).origin) return null;

    const marker = `/storage/v1/object/public/${PROPERTY_PHOTO_BUCKET}/`;
    if (!url.pathname.startsWith(marker)) return null;

    return decodeURIComponent(url.pathname.slice(marker.length));
  } catch {
    return null;
  }
}

export function isTrustedPropertyPhotoUrl(urlValue: string): boolean {
  const key = getPropertyPhotoKey(urlValue);
  return Boolean(
    key &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
        key,
      )
  );
}

export function getPropertyPath(identifier: string): string {
  return `/biens/${encodeURIComponent(identifier)}`;
}

export function getAgencyPath(agencyId: string): string {
  return `/agences/${encodeURIComponent(agencyId)}`;
}

export function getTransactionWilayaPath(
  transaction: "vente" | "location",
  wilaya: string,
): string {
  return `/${transaction}/${encodeURIComponent(wilaya)}`;
}

export type PropertyShareChannel =
  | "whatsapp"
  | "facebook"
  | "telegram"
  | "email";

/** Build the external target for a property share without re-encoding URLs. */
export function getPropertyShareUrl(
  channel: PropertyShareChannel,
  canonicalUrl: string,
  title: string,
): string {
  switch (channel) {
    case "whatsapp": {
      const url = new URL("https://wa.me/");
      url.searchParams.set("text", `${title} ${canonicalUrl}`);
      return url.toString();
    }
    case "facebook": {
      const url = new URL("https://www.facebook.com/sharer/sharer.php");
      url.searchParams.set("u", canonicalUrl);
      return url.toString();
    }
    case "telegram": {
      const url = new URL("https://t.me/share/url");
      url.searchParams.set("url", canonicalUrl);
      url.searchParams.set("text", title);
      return url.toString();
    }
    case "email": {
      const params = new URLSearchParams({
        subject: title,
        body: `شاهد هذا العقار: ${canonicalUrl}`,
      });
      return `mailto:?${params.toString()}`;
    }
  }
}
