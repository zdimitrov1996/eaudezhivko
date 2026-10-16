"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CONCENTRATIONS,
  normalizeSiteUrl,
  type Concentration,
  type Perfume,
  type Shelf,
} from "@/lib/perfumes";
import { toPerfume } from "@/lib/shelf.server";

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
