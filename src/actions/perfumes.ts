"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CONCENTRATIONS,
  normalizeSiteUrl,
  parseSiteRating,
  type Concentration,
  type Perfume,
  type Shelf,
} from "@/lib/perfumes";
import { fetchParfumoRating, needsParfumoRefresh } from "@/lib/parfumo.server";
import { PERFUME_COLUMNS, toPerfume } from "@/lib/shelf.server";

/** `error` is a key into the Errors namespace; `site` fills its {site} placeholder. */
export type AddPerfumeState =
  | { ok: true; at: number }
  | { ok: false; error: string; site?: string }
  | undefined;

function revalidateShelves() {
  revalidatePath("/[locale]/collection", "page");
  revalidatePath("/[locale]/wishlist", "page");
}

function parseShelf(value: unknown): Shelf {
  return value === "wishlist" ? "wishlist" : "collection";
}

/** Escapes LIKE wildcards so a perfume name is matched literally. */
function literalLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

type Ratings = { fragrantica: number | null; parfumo: number | null };

function readRatings(formData: FormData): Ratings | { ok: false; error: string; site: string } {
  const fragrantica = parseSiteRating(formData.get("fragranticaRating"), "fragrantica");
  if (fragrantica === "invalid") return { ok: false, error: "invalidRating", site: "Fragrantica" };
  const parfumo = parseSiteRating(formData.get("parfumoRating"), "parfumo");
  if (parfumo === "invalid") return { ok: false, error: "invalidRating", site: "Parfumo" };
  return { fragrantica, parfumo };
}

/** Returns false if the ratings couldn't be saved. */
async function saveRatings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfumeId: string,
  ratings: Ratings,
) {
  if (ratings.fragrantica === null && ratings.parfumo === null) return true;
  const { error } = await supabase.rpc("set_external_ratings", {
    p_perfume_id: perfumeId,
    p_fragrantica_rating: ratings.fragrantica,
    p_parfumo_rating: ratings.parfumo,
  });
  if (error) console.error("set_external_ratings failed", error);
  return !error;
}

/**
 * Reads the Parfumo rating from the perfume's Parfumo link when it has none
 * yet (or an old one) and nobody typed one in. Failures are ignored: the card
 * then shows the "Add ratings" button.
 */
async function fillParfumoRating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfumeId: string,
) {
  const { data } = await supabase.from("perfumes").select(PERFUME_COLUMNS).eq("id", perfumeId).maybeSingle();
  if (!data) return;
  const perfume = toPerfume(data);
  if (!perfume.parfumoUrl || !needsParfumoRefresh(perfume)) return;

  const rating = await fetchParfumoRating(perfume.parfumoUrl);
  if (rating === null) return;
  await saveRatings(supabase, perfumeId, { fragrantica: null, parfumo: rating });
}

export async function searchPerfumes(query: string): Promise<Perfume[]> {
  const q = query.trim().slice(0, 100);
  if (!isSupabaseConfigured || q.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_perfumes", { q });
  if (error) return [];

  return (data ?? []).map(toPerfume);
}

export async function addPerfume(
  _prev: AddPerfumeState,
  formData: FormData,
): Promise<AddPerfumeState> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "signInRequired" };

  const shelf = parseShelf(formData.get("shelf"));

  const fragranticaUrl = normalizeSiteUrl(formData.get("fragranticaUrl"), "fragrantica");
  if (fragranticaUrl === "invalid") {
    return { ok: false, error: "invalidUrl", site: "Fragrantica" };
  }
  const parfumoUrl = normalizeSiteUrl(formData.get("parfumoUrl"), "parfumo");
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl", site: "Parfumo" };

  const ratings = readRatings(formData);
  if ("error" in ratings) return ratings;

  const supabase = await createClient();
  let perfumeId = String(formData.get("perfumeId") ?? "");

  if (perfumeId) {
    if (fragranticaUrl || parfumoUrl) {
      await supabase.rpc("fill_perfume_links", {
        p_perfume_id: perfumeId,
        p_fragrantica_url: fragranticaUrl ?? "",
        p_parfumo_url: parfumoUrl ?? "",
      });
    }
  } else {
    const brand = String(formData.get("brand") ?? "").trim().slice(0, 100);
    const name = String(formData.get("name") ?? "").trim().slice(0, 150);
    if (!brand || !name) return { ok: false, error: "brandNameRequired" };

    const rawConcentration = String(formData.get("concentration") ?? "");
    const concentration = CONCENTRATIONS.includes(rawConcentration as Concentration)
      ? (rawConcentration as Concentration)
      : null;

    const rawYear = String(formData.get("releaseYear") ?? "").trim();
    const releaseYear = rawYear ? Number(rawYear) : null;
    if (releaseYear !== null && !(Number.isInteger(releaseYear) && releaseYear >= 1700 && releaseYear <= 2100)) {
      return { ok: false, error: "invalidYear" };
    }

    const { data: created, error: insertError } = await supabase
      .from("perfumes")
      .insert({
        brand,
        name,
        concentration,
        release_year: releaseYear,
        fragrantica_url: fragranticaUrl,
        parfumo_url: parfumoUrl,
      })
      .select("id")
      .single();

    if (created) {
      perfumeId = created.id;
    } else if (insertError?.code === "23505") {
      // Already in the catalogue under the same brand, name and concentration
      let lookup = supabase
        .from("perfumes")
        .select("id")
        .ilike("brand", literalLike(brand))
        .ilike("name", literalLike(name));
      lookup = concentration ? lookup.eq("concentration", concentration) : lookup.is("concentration", null);

      const { data: existing } = await lookup.limit(1).maybeSingle();
      if (!existing) return { ok: false, error: "generic" };
      perfumeId = existing.id;

      if (fragranticaUrl || parfumoUrl) {
        await supabase.rpc("fill_perfume_links", {
          p_perfume_id: perfumeId,
          p_fragrantica_url: fragranticaUrl ?? "",
          p_parfumo_url: parfumoUrl ?? "",
        });
      }
    } else {
      return { ok: false, error: "generic" };
    }
  }

  if (!(await saveRatings(supabase, perfumeId, ratings))) {
    return { ok: false, error: "ratingsNotSaved" };
  }
  if (ratings.parfumo === null) await fillParfumoRating(supabase, perfumeId);

  const { data: onShelf } = await supabase
    .from("user_perfumes")
    .select("shelf")
    .eq("perfume_id", perfumeId)
    .maybeSingle();

  if (onShelf) {
    return {
      ok: false,
      error: onShelf.shelf === "collection" ? "alreadyInCollection" : "alreadyInWishlist",
    };
  }

  const { error } = await supabase
    .from("user_perfumes")
    .insert({ perfume_id: perfumeId, shelf });
  if (error) return { ok: false, error: "generic" };

  revalidateShelves();
  return { ok: true, at: Date.now() };
}

export async function moveEntry(entryId: string, shelf: Shelf) {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("user_perfumes")
    .update({ shelf: parseShelf(shelf) })
    .eq("id", entryId);
  revalidateShelves();
}

export async function removeEntry(entryId: string) {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.from("user_perfumes").delete().eq("id", entryId);
  revalidateShelves();
}

export async function rateEntry(entryId: string, rating: number | null) {
  if (!isSupabaseConfigured) return;
  const value =
    rating !== null && Number.isInteger(rating) && rating >= 1 && rating <= 10 ? rating : null;

  const supabase = await createClient();
  await supabase.from("user_perfumes").update({ rating: value }).eq("id", entryId);
  revalidateShelves();
}

/** Updates a perfume's site ratings and fills in links it doesn't have yet. */
export async function updatePerfumeDetails(
  _prev: AddPerfumeState,
  formData: FormData,
): Promise<AddPerfumeState> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  if (!(await getCurrentUser())) return { ok: false, error: "signInRequired" };

  const perfumeId = String(formData.get("perfumeId") ?? "");
  if (!perfumeId) return { ok: false, error: "generic" };

  const fragranticaUrl = normalizeSiteUrl(formData.get("fragranticaUrl"), "fragrantica");
  if (fragranticaUrl === "invalid") {
    return { ok: false, error: "invalidUrl", site: "Fragrantica" };
  }
  const parfumoUrl = normalizeSiteUrl(formData.get("parfumoUrl"), "parfumo");
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl", site: "Parfumo" };

  const ratings = readRatings(formData);
  if ("error" in ratings) return ratings;
  if (ratings.fragrantica === null && ratings.parfumo === null && !fragranticaUrl && !parfumoUrl) {
    return { ok: false, error: "nothingToSave" };
  }

  const supabase = await createClient();
  if (fragranticaUrl || parfumoUrl) {
    await supabase.rpc("fill_perfume_links", {
      p_perfume_id: perfumeId,
      p_fragrantica_url: fragranticaUrl ?? "",
      p_parfumo_url: parfumoUrl ?? "",
    });
  }
  if (!(await saveRatings(supabase, perfumeId, ratings))) {
    return { ok: false, error: "ratingsNotSaved" };
  }
  if (ratings.parfumo === null) await fillParfumoRating(supabase, perfumeId);

  revalidateShelves();
  return { ok: true, at: Date.now() };
}

/**
 * Called by the shelf after it loads, for perfumes whose Parfumo rating is
 * missing or over a week old. Returns how many ratings changed.
 */
export async function refreshParfumoRatings(perfumeIds: string[]): Promise<number> {
  if (!isSupabaseConfigured || !(await getCurrentUser())) return 0;

  const ids = perfumeIds.filter((id) => typeof id === "string").slice(0, 6);
  if (ids.length === 0) return 0;

  const supabase = await createClient();
  const { data } = await supabase.from("perfumes").select(PERFUME_COLUMNS).in("id", ids);
  const due = (data ?? []).map(toPerfume).filter(needsParfumoRefresh);

  const results = await Promise.all(
    due.map(async (perfume) => {
      const rating = await fetchParfumoRating(perfume.parfumoUrl!);
      if (rating === null) return false;
      return saveRatings(supabase, perfume.id, { fragrantica: null, parfumo: rating });
    }),
  );

  const updated = results.filter(Boolean).length;
  if (updated > 0) revalidateShelves();
  return updated;
}
