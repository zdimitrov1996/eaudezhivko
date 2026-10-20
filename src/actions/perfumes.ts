"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CONCENTRATIONS,
  FILL_LEVELS,
  NO_IMAGE_URL,
  normalizeParfumoUrl,
  type Concentration,
  type Perfume,
  type Shelf,
} from "@/lib/perfumes";
import { fetchParfumoData, needsParfumoRefresh, type ParfumoData } from "@/lib/parfumo.server";
import { PERFUME_COLUMNS, toPerfume } from "@/lib/shelf.server";

/** `error` is a key into the Errors namespace. */
export type AddPerfumeState = { ok: true; at: number } | { ok: false; error: string } | undefined;

function revalidateShelves() {
  revalidatePath("/[locale]/collection", "page");
  revalidatePath("/[locale]/wishlist", "page");
  revalidatePath("/[locale]/finished", "page");
}

/** Shelves a perfume can be added or moved to; "finished" is reached by marking a bottle 0%. */
function parseShelf(value: unknown): "collection" | "wishlist" {
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

/** Saves the rating, notes and picture read from a perfume's Parfumo page. */
async function saveParfumoData(supabase: Supabase, perfumeId: string, data: ParfumoData) {
  const { error } = await supabase.rpc("set_parfumo_data", {
    p_perfume_id: perfumeId,
    p_rating: data.rating,
    // {} marks "checked, no notes listed" so we don't re-read it on every visit
    p_notes: data.notes ?? {},
    p_image_url: data.imageUrl ?? NO_IMAGE_URL,
  });
  if (error) console.error("set_parfumo_data failed", error);
  return !error;
}

/**
 * Reads the rating and notes from the perfume's Parfumo page and saves them.
 * A link Parfumo has no perfume for is removed, with what was read from it.
 * Returns true when something changed; other failures leave the perfume as is.
 */
async function syncParfumo(supabase: Supabase, perfume: Perfume) {
  if (!perfume.parfumoUrl) return false;
  const data = await fetchParfumoData(perfume.parfumoUrl);
  if (!data) return false;
  if (data !== "missing") return saveParfumoData(supabase, perfume.id, data);

  const { error } = await supabase.rpc("remove_missing_parfumo_link", {
    p_perfume_id: perfume.id,
    p_parfumo_url: perfume.parfumoUrl,
  });
  if (error) console.error("remove_missing_parfumo_link failed", error);
  return !error;
}

type NewLinkRead = { url: string; data: ParfumoData | null };

/** Reads a link before it's saved: "missing" when Parfumo has no perfume there. */
async function readNewParfumoLink(url: string | null): Promise<NewLinkRead | "missing" | undefined> {
  if (!url) return undefined;
  const data = await fetchParfumoData(url);
  return data === "missing" ? "missing" : { url, data };
}

/**
 * Reads Parfumo data for one perfume if it's missing or a week old. `read` is
 * a new link's page, already fetched to check it, used if that link was saved.
 */
async function syncParfumoIfDue(supabase: Supabase, perfumeId: string, read?: NewLinkRead) {
  const { data } = await supabase.from("perfumes").select(PERFUME_COLUMNS).eq("id", perfumeId).maybeSingle();
  if (!data) return;
  const perfume = toPerfume(data);
  if (!needsParfumoRefresh(perfume)) return;

  if (read && read.url === perfume.parfumoUrl) {
    // If Parfumo didn't answer just now, the shelf tries again on a later visit
    if (read.data) await saveParfumoData(supabase, perfume.id, read.data);
  } else {
    await syncParfumo(supabase, perfume);
  }
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
  const read = await readNewParfumoLink(parfumoUrl);
  if (read === "missing") return { ok: false, error: "parfumoNotFound" };

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

  await syncParfumoIfDue(supabase, perfumeId, read);

  const { data: onShelf } = await supabase
    .from("user_perfumes")
    .select("shelf")
    .eq("perfume_id", perfumeId)
    .maybeSingle();

  if (onShelf) {
    const errors: Record<Shelf, string> = {
      collection: "alreadyInCollection",
      wishlist: "alreadyInWishlist",
      finished: "alreadyFinished",
    };
    return { ok: false, error: errors[onShelf.shelf as Shelf] ?? "generic" };
  }

  const { error } = await supabase
    .from("user_perfumes")
    .insert({ perfume_id: perfumeId, shelf });
  if (error) return { ok: false, error: "generic" };

  revalidateShelves();
  return { ok: true, at: Date.now() };
}

/** Moves a perfume to the collection or wishlist; how full the bottle was is cleared. */
export async function moveEntry(entryId: string, shelf: Shelf) {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase
    .from("user_perfumes")
    .update({ shelf: parseShelf(shelf), fill_level: null })
    .eq("id", entryId);
  revalidateShelves();
}

/** How full a collection bottle is (null: not set); 0 moves it to the finished shelf. */
export async function setFillLevel(entryId: string, level: number | null) {
  if (!isSupabaseConfigured) return;
  if (level !== null && !(FILL_LEVELS as readonly number[]).includes(level)) return;

  const supabase = await createClient();
  await supabase
    .from("user_perfumes")
    .update(level === 0 ? { fill_level: 0, shelf: "finished" } : { fill_level: level })
    .eq("id", entryId)
    .eq("shelf", "collection");
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
  const read = await readNewParfumoLink(parfumoUrl);
  if (read === "missing") return { ok: false, error: "parfumoNotFound" };

  const supabase = await createClient();
  await fillParfumoLink(supabase, perfumeId, parfumoUrl);
  await syncParfumoIfDue(supabase, perfumeId, read);

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
 * enforces this too). A changed Parfumo link clears the old rating, notes and
 * picture and reads the new page.
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
  const read = linkChanged ? await readNewParfumoLink(parfumoUrl) : undefined;
  if (read === "missing") return { ok: false, error: "parfumoNotFound" };

  const { error } = await supabase
    .from("perfumes")
    .update({
      brand: fields.brand,
      name: fields.name,
      concentration: fields.concentration,
      release_year: fields.releaseYear,
      parfumo_url: parfumoUrl,
      // A different page means different data: read it again
      ...(linkChanged
        ? { parfumo_rating: null, parfumo_notes: null, image_url: null, ratings_updated_at: null }
        : {}),
    })
    .eq("id", perfumeId);

  if (error) return { ok: false, error: error.code === "23505" ? "perfumeExists" : "generic" };
  if (linkChanged && parfumoUrl) await syncParfumoIfDue(supabase, perfumeId, read);

  revalidateShelves();
  return { ok: true, at: Date.now() };
}
