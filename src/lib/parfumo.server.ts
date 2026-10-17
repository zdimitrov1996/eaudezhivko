import { normalizeParfumoUrl, type PerfumeNotes } from "./perfumes";

// Parfumo's robots.txt allows perfume pages. Each page carries its score as
// schema.org AggregateRating markup and lists the note pyramid. We read a page
// when its link is saved and refresh it at most weekly. Note images belong to
// Parfumo, so we keep the note names only.

const USER_AGENT = "EauDeFragrances/1.0 (+https://eaudezhivko.vercel.app)";
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 2;
const MAX_NOTES_PER_LAYER = 30;

/** Days before stored Parfumo data is read again. */
export const PARFUMO_REFRESH_DAYS = 7;

export type ParfumoData = {
  rating: number | null;
  notes: PerfumeNotes | null;
  imageUrl: string | null;
};

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

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">", nbsp: " " };

function decodeEntities(text: string) {
  return text
    .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .trim();
}

/**
 * The note pyramid on a perfume page. Parfumo tags each note with its layer:
 * t = top, m = heart, b = base, n = notes of a perfume without a pyramid.
 */
export function parseParfumoNotes(html: string): PerfumeNotes | null {
  const layers: Record<string, keyof PerfumeNotes> = { t: "top", m: "heart", b: "base", n: "notes" };
  const notes: PerfumeNotes = {};
  const pattern =
    /data-nt="([tmbn])"[^>]*>\s*<span[^>]*>\s*(?:<img[^>]*?alt="([^"]*)"[^>]*>)?\s*([^<]*)</g;

  for (const [, layer, alt, text] of html.matchAll(pattern)) {
    const name = decodeEntities(alt || text || "");
    if (!name || name.length > 60) continue;
    const list = (notes[layers[layer]] ??= []);
    if (!list.includes(name) && list.length < MAX_NOTES_PER_LAYER) list.push(name);
  }
  return Object.keys(notes).length > 0 ? notes : null;
}

/**
 * The bottle flacon image from the Parfumo page.
 * Checks og:image, twitter:image, itemprop="image", or media.parfumo CDN flacon links.
 */
export function parseParfumoImage(html: string): string | null {
  const metaMatch =
    html.match(/<meta\s+[^>]*?property=["']og:image["'][^>]*?content=["']([^"']+)["']/i) ??
    html.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:image["']/i) ??
    html.match(/<meta\s+[^>]*?name=["']twitter:image["'][^>]*?content=["']([^"']+)["']/i) ??
    html.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?name=["']twitter:image["']/i);

  let raw = metaMatch?.[1];

  if (!raw) {
    const itemPropMatch =
      html.match(/<meta\s+[^>]*?itemprop=["']image["'][^>]*?content=["']([^"']+)["']/i) ??
      html.match(/<img\s+[^>]*?itemprop=["']image["'][^>]*?src=["']([^"']+)["']/i);
    raw = itemPropMatch?.[1];
  }

  if (!raw) {
    const cdnMatch = html.match(/src=["'](https?:\/\/[a-z0-9.-]*parfumo\.[a-z.]{2,6}\/perfumes\/[^"']+)["']/i);
    raw = cdnMatch?.[1];
  }

  if (!raw) return null;
  const decoded = decodeEntities(raw);

  try {
    const url = new URL(decoded);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!/([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}$/i.test(url.hostname)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

/** Fetches a Parfumo perfume page; null on any failure. */
export async function fetchParfumoData(url: string): Promise<ParfumoData | null> {
  let next = normalizeParfumoUrl(url);

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
        next = location ? normalizeParfumoUrl(new URL(location, next).toString()) : null;
        continue;
      }
      if (!response.ok) return null;
      const html = await response.text();
      const data = {
        rating: parseParfumoRating(html),
        notes: parseParfumoNotes(html),
        imageUrl: parseParfumoImage(html),
      };
      return data.rating === null && data.notes === null && data.imageUrl === null ? null : data;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * True when a perfume with a Parfumo link hasn't been read yet (notes are
 * stored as {} once read, even if Parfumo lists none) or was read over a week
 * ago. A perfume Parfumo hasn't rated yet waits for the weekly refresh.
 */
export function needsParfumoRefresh(perfume: {
  parfumoUrl: string | null;
  parfumoNotes: PerfumeNotes | null;
  ratingsUpdatedAt: string | null;
}) {
  if (!perfume.parfumoUrl) return false;
  if (perfume.parfumoNotes === null || !perfume.ratingsUpdatedAt) return true;
  const ageMs = Date.now() - new Date(perfume.ratingsUpdatedAt).getTime();
  return ageMs > PARFUMO_REFRESH_DAYS * 24 * 60 * 60 * 1000;
}
