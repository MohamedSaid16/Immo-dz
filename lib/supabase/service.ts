import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client for trusted social-publishing transitions.
 *
 * This module must never be imported by Client Components. Normal agency CRUD
 * continues to use the authenticated SSR client and RLS.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase trusted publishing credentials are not configured.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
