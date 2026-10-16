import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

// Server-only: the secret key bypasses Row Level Security. It must never get a
// NEXT_PUBLIC_ prefix, and must only be used after the caller is checked to be
// an admin. On Vercel it comes from the Supabase integration.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** False where the secret key isn't set (e.g. locally): support login is unavailable. */
export const isAdminApiConfigured = Boolean(supabaseUrl && secretKey);

export function createAdminClient() {
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
