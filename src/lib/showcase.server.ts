import type { Concentration } from "./perfumes";
import { SHOWCASE, type ShowcasePerfume } from "./showcase";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export const SHOWCASE_COLUMNS = "id, brand, name, concentration, parfumo_url, image_url, parfumo_rating, parfumo_read_at";

export type ShowcaseRow = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  parfumo_url: string;
  image_url: string;
  parfumo_rating: number | string | null;
  parfumo_read_at: string | null;
};

export function toShowcasePerfume(row: ShowcaseRow): ShowcasePerfume {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    concentration: row.concentration,
    parfumoUrl: row.parfumo_url,
    imageUrl: row.image_url,
    // Postgres numeric arrives as a string or number depending on the path
    parfumoRating: row.parfumo_rating === null ? null : Number(row.parfumo_rating),
  };
}

/** The carousel in the admins' order; throws if the database can't be read. */
export async function readShowcase(): Promise<ShowcasePerfume[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showcase").select(SHOWCASE_COLUMNS).order("position");
  if (error) throw error;
  return (data as ShowcaseRow[]).map(toShowcasePerfume);
}

/** For the homepage: the built-in list when there's no database or nothing in it. */
export async function getShowcase(): Promise<ShowcasePerfume[]> {
  if (!isSupabaseConfigured) return SHOWCASE;
  try {
    const perfumes = await readShowcase();
    return perfumes.length > 0 ? perfumes : SHOWCASE;
  } catch {
    return SHOWCASE;
  }
}
