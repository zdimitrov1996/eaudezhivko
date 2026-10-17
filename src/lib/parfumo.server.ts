import { normalizeSiteUrl } from "./perfumes";

// Parfumo's robots.txt allows perfume pages, and each page carries its score as
// schema.org AggregateRating markup. We read one page when a link is saved and
// refresh it at most weekly. Fragrantica blocks automated requests, so its
// rating stays typed in by people; never try to get around that block.

const USER_AGENT = "EauDeFragrances/1.0 (+https://eaudezhivko.vercel.app)";
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 2;

/** Days before a stored Parfumo rating is read again. */
export const PARFUMO_REFRESH_DAYS = 7;

/** The Parfumo community rating (0–10) on a perfume page, or null if not found. */
export function parseParfumoRating(html: string): number | null {
  const start = html.indexOf('itemprop="aggregateRating"');
  if (start === -1) return null;
  const block = html.slice(start, start + 2000);

  const match = block.match(
    /itemprop="ratingValue"[^>]*?(?:content="([\d.,]+)"[^>]*>|>\s*([\d.,]+))/,
  );
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;

  const best = Number(block.match(/itemprop="bestRating"[^>]*content="([\d.]+)"/)?.[1] ?? 10);
  const value = (Number(raw.replace(",", ".")) / (best || 10)) * 10;
  if (!Number.isFinite(value) || value < 0 || value > 10) return null;
  return Math.round(value * 10) / 10;
}

/** Fetches a Parfumo perfume page and returns its rating, or null on any failure. */
export async function fetchParfumoRating(url: string): Promise<number | null> {
  let next = normalizeSiteUrl(url, "parfumo");

  // Follow redirects by hand so a link can never lead the server off Parfumo
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!next || next === "invalid") return null;
    try {
      const response = await fetch(next, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        next = location ? normalizeSiteUrl(new URL(location, next).toString(), "parfumo") : null;
        continue;
      }
      if (!response.ok) return null;
      return parseParfumoRating(await response.text());
    } catch {
      return null;
    }
  }
  return null;
}

/** True when a perfume with a Parfumo link has no rating yet, or an old one. */
export function needsParfumoRefresh(perfume: {
  parfumoUrl: string | null;
  parfumoRating: number | null;
  ratingsUpdatedAt: string | null;
}) {
  if (!perfume.parfumoUrl) return false;
  if (perfume.parfumoRating === null || !perfume.ratingsUpdatedAt) return true;
  const ageMs = Date.now() - new Date(perfume.ratingsUpdatedAt).getTime();
  return ageMs > PARFUMO_REFRESH_DAYS * 24 * 60 * 60 * 1000;
}
