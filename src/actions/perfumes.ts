"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CONCENTRATIONS,
  normalizeParfumoUrl,
  type Concentration,
  type Perfume,
  type Shelf,
} from "@/lib/perfumes";
import { fetchParfumoData, needsParfumoRefresh } from "@/lib/parfumo.server";
import { PERFUME_COLUMNS, toPerfume } from "@/lib/shelf.server";

/** `error` is a key into the Errors namespace. */
export type AddPerfumeState = { ok: true; at: number } | { ok: false; error: string } | undefined;

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

type Supabase = Awaited<ReturnType<typeof createClient>>;

type PerfumeFields = {
  brand: string;
  name: string;
  concentration: Concentration | null;
  releaseYear: number | null;
};

/** Brand, name, concentration and year from the add/edit forms, validated. */
function readPerfumeFields(formData: FormData): PerfumeFields | { ok: false; error: string } {
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

  return { brand, name, concentration, releaseYear };
}

/**
 * Reads the rating and notes from the perfume's Parfumo page and saves them.
 * Returns true when something was saved; failures leave the perfume as is.
 */
async function syncParfumo(supabase: Supabase, perfume: Perfume) {
  if (!perfume.parfumoUrl) return false;
  const data = await fetchParfumoData(perfume.parfumoUrl);
  if (!data) return false;

  const { error } = await supabase.rpc("set_parfumo_data", {
    p_perfume_id: perfume.id,
    p_rating: data.rating,
    // {} marks "checked, no notes listed" so we don't re-read it on every visit
    p_notes: data.notes ?? {},
    p_image_url: data.imageUrl ?? null,
  });
  if (error) console.error("set_parfumo_data failed", error);
  return !error;
}

/** Reads Parfumo data for one perfume if it's missing or a week old. */
async function syncParfumoIfDue(supabase: Supabase, perfumeId: string) {
  const { data } = await supabase.from("perfumes").select(PERFUME_COLUMNS).eq("id", perfumeId).maybeSingle();
  if (!data) return;
  const perfume = toPerfume(data);
  if (needsParfumoRefresh(perfume)) await syncParfumo(supabase, perfume);
}

/** Adds a Parfumo link to a perfume that has none (links already set stay). */
async function fillParfumoLink(supabase: Supabase, perfumeId: string, parfumoUrl: string) {
  await supabase.rpc("fill_perfume_links", {
    p_perfume_id: perfumeId,
    p_fragrantica_url: "",
    p_parfumo_url: parfumoUrl,
  });
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

  const parfumoUrl = normalizeParfumoUrl(formData.get("parfumoUrl"));
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl" };

  const supabase = await createClient();
  let perfumeId = String(formData.get("perfumeId") ?? "");

  if (perfumeId) {
    if (parfumoUrl) await fillParfumoLink(supabase, perfumeId, parfumoUrl);
  } else {
    const fields = readPerfumeFields(formData);
    if ("error" in fields) return fields;
    const { brand, name, concentration, releaseYear } = fields;

    const { data: created, error: insertError } = await supabase
      .from("perfumes")
      .insert({
        brand,
        name,
        concentration,
        release_year: releaseYear,
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

      if (parfumoUrl) await fillParfumoLink(supabase, perfumeId, parfumoUrl);
    } else {
      return { ok: false, error: "generic" };
    }
  }

  await syncParfumoIfDue(supabase, perfumeId);

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

/** Adds a Parfumo link to a perfume that has none, then reads its rating and notes. */
export async function addParfumoLink(
  _prev: AddPerfumeState,
  formData: FormData,
): Promise<AddPerfumeState> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  if (!(await getCurrentUser())) return { ok: false, error: "signInRequired" };

  const perfumeId = String(formData.get("perfumeId") ?? "");
  if (!perfumeId) return { ok: false, error: "generic" };

  const parfumoUrl = normalizeParfumoUrl(formData.get("parfumoUrl"));
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl" };
  if (!parfumoUrl) return { ok: false, error: "linkRequired" };

  const supabase = await createClient();
  await fillParfumoLink(supabase, perfumeId, parfumoUrl);
  await syncParfumoIfDue(supabase, perfumeId);

  revalidateShelves();
  return { ok: true, at: Date.now() };
}

/**
 * Called by the shelf after it loads, for perfumes whose Parfumo data is
 * missing or over a week old. Returns how many perfumes changed.
 */
export async function refreshParfumoData(perfumeIds: string[]): Promise<number> {
  if (!isSupabaseConfigured || !(await getCurrentUser())) return 0;

  const ids = perfumeIds.filter((id) => typeof id === "string").slice(0, 6);
  if (ids.length === 0) return 0;

  const supabase = await createClient();
  const { data } = await supabase.from("perfumes").select(PERFUME_COLUMNS).in("id", ids);
  const due = (data ?? []).map(toPerfume).filter(needsParfumoRefresh);

  const results = await Promise.all(due.map((perfume) => syncParfumo(supabase, perfume)));
  const updated = results.filter(Boolean).length;
  if (updated > 0) revalidateShelves();
  return updated;
}

/**
 * Edits a catalogue perfume. Only the person who added it may (the database
 * enforces this too). A changed Parfumo link clears the old rating and notes
 * and reads the new page.
 */
export async function updatePerfume(
  _prev: AddPerfumeState,
  formData: FormData,
): Promise<AddPerfumeState> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "signInRequired" };

  const perfumeId = String(formData.get("perfumeId") ?? "");
  const fields = readPerfumeFields(formData);
  if ("error" in fields) return fields;
  const parfumoUrl = normalizeParfumoUrl(formData.get("parfumoUrl"));
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl" };

  const supabase = await createClient();
  const { data: current } = await supabase.from("perfumes").select(PERFUME_COLUMNS).eq("id", perfumeId).maybeSingle();
  if (!current) return { ok: false, error: "generic" };
  const before = toPerfume(current);
  if (before.createdBy !== user.id) return { ok: false, error: "notYourPerfume" };

  const linkChanged = (before.parfumoUrl ?? null) !== (parfumoUrl ?? null);
  const { error } = await supabase
    .from("perfumes")
    .update({
      brand: fields.brand,
      name: fields.name,
      concentration: fields.concentration,
      release_year: fields.releaseYear,
      parfumo_url: parfumoUrl,
      // A different page means different data: read it again
      ...(linkChanged ? { parfumo_rating: null, parfumo_notes: null, ratings_updated_at: null } : {}),
    })
    .eq("id", perfumeId);

  if (error) return { ok: false, error: error.code === "23505" ? "perfumeExists" : "generic" };
  if (linkChanged && parfumoUrl) await syncParfumoIfDue(supabase, perfumeId);

  revalidateShelves();
  return { ok: true, at: Date.now() };
}
