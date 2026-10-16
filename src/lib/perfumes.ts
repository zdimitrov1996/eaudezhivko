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
};

export type PerfumeStats = {
  avgRating: number | null;
  ratingCount: number;
  collectors: number;
  wishers: number;
};

export type ShelfEntry = {
  id: string;
  shelf: Shelf;
  rating: number | null;
  perfume: Perfume;
  stats: PerfumeStats;
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
export function perfumeLink(perfume: Perfume, site: LinkSite) {
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

export const EMPTY_STATS: PerfumeStats = {
  avgRating: null,
  ratingCount: 0,
  collectors: 0,
  wishers: 0,
};
