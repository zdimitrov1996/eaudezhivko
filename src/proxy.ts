import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // Auth callbacks live outside the [locale] segment
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return updateSession(request, NextResponse.next({ request }));
  }

  return updateSession(request, handleI18nRouting(request));
}

export const config = {
  // Everything except Next internals, API routes and static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
