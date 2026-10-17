// Shared perfume types and helpers (safe for both server and client code)

export const CONCENTRATIONS = [
  "extrait",
  "parfum",
  "edp",
  "edt",
  "edc",
  "eau_fraiche",
  "other",
] as const;

export type Concentration = (typeof CONCENTRATIONS)[number];
export type Shelf = "collection" | "wishlist";

export type Perfume = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  releaseYear: number | null;
  fragranticaUrl: string | null;
  parfumoUrl: string | null;
  /** Typed in by users from the sites: Fragrantica out of 5, Parfumo out of 10 */
  fragranticaRating: number | null;
  parfumoRating: number | null;
  ratingsUpdatedAt: string | null;
};

export type ShelfEntry = {
  id: string;
  shelf: Shelf;
  rating: number | null;
  perfume: Perfume;
};

export type LinkSite = "fragrantica" | "parfumo";

const SITE_HOSTS: Record<LinkSite, RegExp> = {
  fragrantica: /^([a-z0-9-]+\.)?fragrantica\.[a-z.]{2,6}$/,
  parfumo: /^([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}$/,
};

/**
 * Validates a pasted Fragrantica / Parfumo page link.
 * Returns the cleaned https URL, null for an empty value, or "invalid".
 */
export function normalizeSiteUrl(raw: unknown, site: LinkSite): string | null | "invalid" {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return "invalid";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return "invalid";
  if (!SITE_HOSTS[site].test(url.hostname)) return "invalid";

  url.protocol = "https:";
  url.hash = "";
  return url.toString();
}

function searchQuery(perfume: Pick<Perfume, "brand" | "name">) {
  return encodeURIComponent(`${perfume.brand} ${perfume.name}`);
}

/** The perfume's own page if we have it, otherwise a search on the site. */
export function perfumeLink(
  perfume: Pick<Perfume, "brand" | "name" | "fragranticaUrl" | "parfumoUrl">,
  site: LinkSite,
) {
  if (site === "fragrantica") {
    return perfume.fragranticaUrl
      ? { href: perfume.fragranticaUrl, isSearch: false }
      : { href: `https://www.fragrantica.com/search/?query=${searchQuery(perfume)}`, isSearch: true };
  }
  return perfume.parfumoUrl
    ? { href: perfume.parfumoUrl, isSearch: false }
    : {
        href: `https://www.parfumo.com/s_perfumes_x.php?in=1&filter=${searchQuery(perfume)}`,
        isSearch: true,
      };
}

/** Fragrantica rates out of 5, Parfumo out of 10. */
export const RATING_SCALES = { fragrantica: 5, parfumo: 10 } as const;

/**
 * Average of the Fragrantica and Parfumo ratings on a 10-point scale
 * (Fragrantica doubled), or null when neither is known.
 */
export function externalAverage(perfume: Pick<Perfume, "fragranticaRating" | "parfumoRating">) {
  const scores = [
    perfume.fragranticaRating === null ? null : perfume.fragranticaRating * 2,
    perfume.parfumoRating,
  ].filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Parses a typed rating ("4.2" or "4,2") for a site. Returns null for an empty
 * value and "invalid" when it isn't a number within the site's scale.
 */
export function parseSiteRating(raw: unknown, site: LinkSite): number | null | "invalid" {
  const value = typeof raw === "string" ? raw.trim().replace(",", ".") : "";
  if (!value) return null;
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > RATING_SCALES[site]) return "invalid";
  return rating;
}

