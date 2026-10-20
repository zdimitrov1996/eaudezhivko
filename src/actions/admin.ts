"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { isAdmin, isOwner } from "@/lib/admin.server";
import { EMAIL_PATTERN } from "@/lib/email";
import { SUPPORT_SESSION_COOKIE } from "@/lib/impersonation";
import { fetchParfumoData, PARFUMO_REFRESH_DAYS } from "@/lib/parfumo.server";
import { CONCENTRATIONS, normalizeParfumoUrl } from "@/lib/perfumes";
import { SHOWCASE_MAX } from "@/lib/showcase";
import { SHOWCASE_COLUMNS, type ShowcaseRow } from "@/lib/showcase.server";
import { createAdminClient, isAdminApiConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Signs the admin out and into `userId`'s account, for reproducing bugs. */
export async function impersonateUser(userId: string) {
  const locale = await getLocale();
  if (!(await isAdmin())) return redirect({ href: "/", locale });

  const userPage = `/admin/users/${userId}`;
  if (!isAdminApiConfigured) {
    return redirect({ href: { pathname: userPage, query: { error: "noSecretKey" } }, locale });
  }

  // Checks the target isn't an admin or yourself, and writes the audit log
  const supabase = await createClient();
  const { data: email, error } = await supabase.rpc("admin_begin_impersonation", {
    p_user_id: userId,
  });
  if (error || typeof email !== "string") {
    return redirect({ href: { pathname: userPage, query: { error: "impersonateFailed" } }, locale });
  }

  // A one-time sign-in token for the target; no email is sent
  const { data: link, error: linkError } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return redirect({ href: { pathname: userPage, query: { error: "impersonateFailed" } }, locale });
  }

  await supabase.auth.signOut({ scope: "local" });
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) {
    return redirect({ href: { pathname: "/login", query: { error: "generic" } }, locale });
  }

  (await cookies()).set(SUPPORT_SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return redirect({ href: "/collection", locale });
}

export async function deleteUserAsAdmin(userId: string) {
  const locale = await getLocale();
  if (!(await isAdmin())) return redirect({ href: "/", locale });

  // Refuses admins and yourself, logs the deletion, then deletes
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
  if (error) {
    return redirect({
      href: { pathname: `/admin/users/${userId}`, query: { error: "deleteFailed" } },
      locale,
    });
  }

  revalidatePath("/[locale]/admin", "layout");
  return redirect({ href: { pathname: "/admin", query: { deleted: "1" } }, locale });
}

/** Back to new, or in progress (which tells a signed-in author). Done goes through `completeFeedback`. */
export async function setFeedbackStatus(id: number, status: "new" | "in_progress") {
  if (!(await isAdmin())) return;

  const supabase = await createClient();
  await supabase.rpc("admin_set_feedback_status", {
    p_id: id,
    p_status: status === "in_progress" ? "in_progress" : "new",
  });
  revalidatePath("/[locale]/admin", "layout");
}

/** `error` is a key into the Errors namespace. */
export type FeedbackDoneState = { ok: true; at: number } | { ok: false; error: string } | undefined;

/** Marks feedback done with a note on what was done; a signed-in author gets it as a notification. */
export async function completeFeedback(_prev: FeedbackDoneState, formData: FormData): Promise<FeedbackDoneState> {
  if (!(await isAdmin())) return { ok: false, error: "generic" };

  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(id)) return { ok: false, error: "generic" };
  if (!note) return { ok: false, error: "noteRequired" };
  if (note.length > 1000) return { ok: false, error: "noteTooLong" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_feedback_status", { p_id: id, p_status: "done", p_note: note });
  if (error) return { ok: false, error: error.hint === "note_required" ? "noteRequired" : "generic" };

  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, at: Date.now() };
}

/** Deletes a feedback message for good (the page asks for confirmation first). */
export async function deleteFeedback(id: number) {
  if (!(await isAdmin())) return;

  const supabase = await createClient();
  await supabase.rpc("admin_delete_feedback", { p_id: id });
  revalidatePath("/[locale]/admin", "layout");
}

// ---------------------------------------------------------------------------
// Homepage carousel (any admin)
// ---------------------------------------------------------------------------

function revalidateShowcase() {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/admin/showcase", "page");
}

/** `error` is a key into the Errors namespace. */
export type ShowcaseFormState = { ok: true; at: number } | { ok: false; error: string } | undefined;

/**
 * Adds a carousel perfume, or edits one when the form has an id. Reads the
 * picture and rating from the Parfumo page first: no picture, no slide.
 */
export async function saveShowcasePerfume(
  _prev: ShowcaseFormState,
  formData: FormData,
): Promise<ShowcaseFormState> {
  if (!(await isAdmin())) return { ok: false, error: "generic" };

  const brand = String(formData.get("brand") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!brand || !name) return { ok: false, error: "brandNameRequired" };
  const concentration = String(formData.get("concentration") ?? "");
  const parfumoUrl = normalizeParfumoUrl(formData.get("parfumoUrl"));
  if (parfumoUrl === "invalid") return { ok: false, error: "invalidUrl" };
  if (!parfumoUrl) return { ok: false, error: "linkRequired" };

  const parfumo = await fetchParfumoData(parfumoUrl);
  if (parfumo === "missing") return { ok: false, error: "parfumoNotFound" };
  if (!parfumo) return { ok: false, error: "parfumoUnreachable" };
  if (!parfumo.imageUrl) return { ok: false, error: "parfumoNoPicture" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_showcase_save", {
    p_id: String(formData.get("id") ?? "") || null,
    p_brand: brand,
    p_name: name,
    p_concentration: (CONCENTRATIONS as readonly string[]).includes(concentration) ? concentration : null,
    p_parfumo_url: parfumoUrl,
    p_image_url: parfumo.imageUrl,
    p_rating: parfumo.rating,
  });
  if (error) return { ok: false, error: error.code === "54000" ? "showcaseFull" : "generic" };

  revalidateShowcase();
  return { ok: true, at: Date.now() };
}

/**
 * Called by the carousel page after it loads: re-reads Parfumo for slides not
 * read in a week, keeping the old picture or rating if the page lacks one.
 */
export async function refreshShowcase(ids: string[]): Promise<number> {
  if (!(await isAdmin())) return 0;

  const supabase = await createClient();
  const { data } = await supabase.from("showcase").select(SHOWCASE_COLUMNS).in("id", ids.slice(0, SHOWCASE_MAX));
  const weekAgo = Date.now() - PARFUMO_REFRESH_DAYS * 24 * 60 * 60 * 1000;
  const due = ((data ?? []) as ShowcaseRow[]).filter(
    (row) => !row.parfumo_read_at || new Date(row.parfumo_read_at).getTime() < weekAgo,
  );

  const results = await Promise.all(
    due.map(async (row) => {
      const parfumo = await fetchParfumoData(row.parfumo_url);
      // A slide whose page Parfumo no longer has keeps its picture and rating
      if (!parfumo || parfumo === "missing") return false;
      const { error } = await supabase.rpc("admin_showcase_save", {
        p_id: row.id,
        p_brand: row.brand,
        p_name: row.name,
        p_concentration: row.concentration,
        p_parfumo_url: row.parfumo_url,
        p_image_url: parfumo.imageUrl ?? row.image_url,
        p_rating: parfumo.rating ?? row.parfumo_rating,
      });
      return !error;
    }),
  );

  const updated = results.filter(Boolean).length;
  if (updated > 0) revalidateShowcase();
  return updated;
}

export async function removeFromShowcase(id: string) {
  const locale = await getLocale();
  if (!(await isAdmin())) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_showcase_remove", { p_id: id });
  revalidateShowcase();

  const query = error
    ? { error: error.code === "23514" ? "showcaseLast" : "showcaseFailed" }
    : { notice: "showcaseRemoved" };
  return redirect({ href: { pathname: "/admin/showcase", query }, locale });
}

/** Swaps the perfume with its neighbour: -1 earlier, 1 later. */
export async function moveInShowcase(id: string, offset: -1 | 1) {
  if (!(await isAdmin())) return;

  const supabase = await createClient();
  await supabase.rpc("admin_showcase_move", { p_id: id, p_offset: offset < 0 ? -1 : 1 });
  revalidateShowcase();
}

// ---------------------------------------------------------------------------
// Admins (owner only; the database checks it too)
// ---------------------------------------------------------------------------

/** `error` is a key into Admin.grantErrors. */
export type GrantAdminState = { ok: true; email: string; at: number } | { ok: false; error: string } | undefined;

function grantError(code: string | undefined) {
  if (code === "P0002") return "notFound";
  if (code === "55000") return "notConfirmed";
  if (code === "23505") return "alreadyAdmin";
  if (code === "42501") return "notOwner";
  return "generic";
}

export async function grantAdmin(_prev: GrantAdminState, formData: FormData): Promise<GrantAdminState> {
  if (!(await isOwner())) return { ok: false, error: "notOwner" };

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_admin", { p_email: email });
  if (error) return { ok: false, error: grantError(error.code) };

  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, email, at: Date.now() };
}

/** The same, from a user's page in the panel. */
export async function grantAdminToUser(userId: string, email: string) {
  const locale = await getLocale();
  if (!(await isOwner())) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_admin", { p_email: email });
  revalidatePath("/[locale]/admin", "layout");

  const query = error ? { error: `grant_${grantError(error.code)}` } : { notice: "adminGranted" };
  return redirect({ href: { pathname: `/admin/users/${userId}`, query }, locale });
}

/** `returnTo` is the panel page the button was on. */
export async function revokeAdmin(userId: string, returnTo: "admins" | "user") {
  const locale = await getLocale();
  if (!(await isOwner())) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_admin", { p_user_id: userId });
  revalidatePath("/[locale]/admin", "layout");

  const pathname = returnTo === "user" ? `/admin/users/${userId}` : "/admin/admins";
  const query = error ? { error: "revokeFailed" } : { notice: "adminRevoked" };
  return redirect({ href: { pathname, query }, locale });
}

