import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./config";

/** Refreshes the Supabase session cookie on `response` if it has expired. */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Validates the JWT and refreshes it when needed. Don't run code between
  // createServerClient and this call.
  await supabase.auth.getClaims();

  return response;
}
