import { canShowcase, SHOWCASE, type ShowcasePerfume } from "./showcase";
import { isSupabaseConfigured } from "./supabase/config";
import { PERFUME_COLUMNS, toPerfume, type PerfumeRow } from "./shelf.server";
import { createClient } from "./supabase/server";

/**
 * The homepage carousel in the order the admins set. Falls back to the
 * built-in list without a database, or before the showcase migration has run.
 */
export async function getShowcase(): Promise<ShowcasePerfume[]> {
  if (!isSupabaseConfigured) return SHOWCASE;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showcase_perfumes")
    .select(`position, perfume:perfumes (${PERFUME_COLUMNS})`)
    .order("position");
  if (error || !data) return SHOWCASE;

  const perfumes = (data as unknown as { perfume: PerfumeRow | null }[]).flatMap(({ perfume: row }) => {
    if (!row) return [];
    const perfume = toPerfume(row);
    if (!canShowcase(perfume) || !perfume.parfumoUrl || !perfume.imageUrl) return [];
    return [
      {
        id: perfume.id,
        brand: perfume.brand,
        name: perfume.name,
        concentration: perfume.concentration,
        parfumoUrl: perfume.parfumoUrl,
        imageUrl: perfume.imageUrl,
        parfumoRating: perfume.parfumoRating,
      },
    ];
  });
  return perfumes.length > 0 ? perfumes : SHOWCASE;
}
