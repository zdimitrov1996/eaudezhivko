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

/** Note pyramid from Parfumo; "notes" is for perfumes listed without a pyramid. */
export type PerfumeNotes = {
  top?: string[];
  heart?: string[];
  base?: string[];
  notes?: string[];
};

export const NOTE_LAYERS = ["top", "heart", "base", "notes"] as const;

export type Perfume = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  releaseYear: number | null;
  parfumoUrl: string | null;
  /** Read from the Parfumo page, out of 10 */
  parfumoRating: number | null;
  parfumoNotes: PerfumeNotes | null;
  ratingsUpdatedAt: string | null;
  /** Who added it to the shared catalogue; only they can edit it */
  createdBy: string | null;
};

export type ShelfEntry = {
  id: string;
  shelf: Shelf;
  rating: number | null;
  perfume: Perfume;
};

const PARFUMO_HOST = /^([a-z0-9-]+\.)?parfumo\.[a-z.]{2,6}$/;

/**
 * Validates a pasted Parfumo page link.
 * Returns the cleaned https URL, null for an empty value, or "invalid".
 */
export function normalizeParfumoUrl(raw: unknown): string | null | "invalid" {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return "invalid";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return "invalid";
  if (!PARFUMO_HOST.test(url.hostname)) return "invalid";

  url.protocol = "https:";
  url.hash = "";
  return url.toString();
}

/** The perfume's Parfumo page if we have it, otherwise a Parfumo search. */
export function parfumoLink(perfume: Pick<Perfume, "brand" | "name" | "parfumoUrl">) {
  if (perfume.parfumoUrl) return { href: perfume.parfumoUrl, isSearch: false };
  const query = encodeURIComponent(`${perfume.brand} ${perfume.name}`);
  return { href: `https://www.parfumo.com/s_perfumes_x.php?in=1&filter=${query}`, isSearch: true };
}

/** True when the notes object has at least one note. */
export function hasNotes(notes: PerfumeNotes | null): notes is PerfumeNotes {
  return Boolean(notes && NOTE_LAYERS.some((layer) => (notes[layer]?.length ?? 0) > 0));
}
