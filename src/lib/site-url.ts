import { headers } from "next/headers";

/** Absolute origin of this site, used for auth redirect links. */
export async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Only allow same-site paths, so `?next=` can't redirect off-site. Resolving
 * against a dummy origin catches every trick browsers accept ("//", "/\\",
 * tabs or newlines that URL parsing drops).
 */
export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const url = new URL(value, "https://same.site");
  if (url.origin !== "https://same.site") return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
