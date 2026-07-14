import type { SupabaseClient } from "@supabase/supabase-js";

import { getPropertyPhotoKey, getPropertyPhotoUrl } from "@/lib/site-url";

/**
 * Property photo storage backed by Supabase Storage.
 * The bucket is public, so `getPublicUrl` builds a stable public URL and
 * `keyFromUrl` reverses it for deletes. Create the bucket with
 * `supabase/storage.sql`.
 */
export const PHOTO_BUCKET = "property-photos";

/** Upload bytes to the bucket and return the public URL. */
export async function uploadFile(
  supabase: SupabaseClient,
  body: Buffer | Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(key, body, { contentType, upsert: false });
  if (error) throw error;
  return getPublicUrl(key);
}

/** Remove an object from the bucket. */
export async function deleteFile(
  supabase: SupabaseClient,
  key: string,
): Promise<void> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([key]);
  if (error) throw error;
}

/** Public URL for an object key in the (public) bucket. */
export function getPublicUrl(key: string): string {
  return getPropertyPhotoUrl(key);
}

/** Reverse of getPublicUrl: extract the object key from a stored URL. */
export function keyFromUrl(url: string): string | null {
  return getPropertyPhotoKey(url);
}
