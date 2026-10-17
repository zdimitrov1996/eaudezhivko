import { createClient } from "./supabase/server";
import {
  EMPTY_STATS,
  type Concentration,
  type Perfume,
  type PerfumeStats,
  type Shelf,
  type ShelfEntry,
} from "./perfumes";

type PerfumeRow = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  release_year: number | null;
  fragrantica_url: string | null;
  parfumo_url: string | null;
  fragrantica_rating: number | string | null;
  parfumo_rating: number | string | null;
  ratings_updated_at: string | null;
};

type StatsRow = {
  perfume_id: string;
  avg_rating: number | string | null;
  rating_count: number;
  collectors: number;
  wishers: number;
};

export const PERFUME_COLUMNS =
  "id, brand, name, concentration, release_year, fragrantica_url, parfumo_url, fragrantica_rating, parfumo_rating, ratings_updated_at";

// Postgres numeric arrives as a string or number depending on the path
const toNumber = (value: number | string | null) => (value === null ? null : Number(value));

export function toPerfume(row: PerfumeRow): Perfume {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    concentration: row.concentration,
    releaseYear: row.release_year,
    fragranticaUrl: row.fragrantica_url,
    parfumoUrl: row.parfumo_url,
    fragranticaRating: toNumber(row.fragrantica_rating),
    parfumoRating: toNumber(row.parfumo_rating),
    ratingsUpdatedAt: row.ratings_updated_at,
  };
}

/** The signed-in user's perfumes on one shelf, newest first, with community stats. */
export async function getShelf(shelf: Shelf): Promise<ShelfEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_perfumes")
    .select(`id, shelf, rating, perfume:perfumes (${PERFUME_COLUMNS})`)
    .eq("shelf", shelf)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    shelf: Shelf;
    rating: number | null;
    perfume: PerfumeRow | null;
  }[];

  const ids = rows.flatMap((row) => (row.perfume ? [row.perfume.id] : []));
  const stats = new Map<string, PerfumeStats>();

  if (ids.length > 0) {
    const { data: statRows, error: statsError } = await supabase.rpc("perfume_stats", {
      p_ids: ids,
    });
    if (statsError) throw statsError;

    for (const row of (statRows ?? []) as StatsRow[]) {
      stats.set(row.perfume_id, {
        avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
        ratingCount: row.rating_count,
        collectors: row.collectors,
        wishers: row.wishers,
      });
    }
  }

  return rows.flatMap((row) =>
    row.perfume
      ? [
          {
            id: row.id,
            shelf: row.shelf,
            rating: row.rating,
            perfume: toPerfume(row.perfume),
            stats: stats.get(row.perfume.id) ?? EMPTY_STATS,
          },
        ]
      : [],
  );
}
