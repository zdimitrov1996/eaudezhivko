"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { isAdmin, isOwner } from "@/lib/admin.server";
import { SUPPORT_SESSION_COOKIE } from "@/lib/impersonation";
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

export async function setFeedbackStatus(id: number, status: "new" | "done") {
  if (!(await isAdmin())) return;

  const supabase = await createClient();
  await supabase.rpc("admin_set_feedback_status", {
    p_id: id,
    p_status: status === "done" ? "done" : "new",
  });
  revalidatePath("/[locale]/admin", "layout");
}

// ---------------------------------------------------------------------------
// Homepage carousel (any admin)
// ---------------------------------------------------------------------------

function revalidateShowcase() {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/admin/showcase", "page");
}

/** `search` keeps the admin's catalogue search open after adding. */
export async function addToShowcase(perfumeId: string, search: string) {
  const locale = await getLocale();
  if (!(await isAdmin())) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_showcase_add", { p_perfume_id: perfumeId });
  revalidateShowcase();

  const query: Record<string, string> = search ? { q: search } : {};
  if (error) {
    query.error =
      error.code === "54000" ? "showcaseFull" : error.code === "22023" ? "showcaseNeedsPicture" : "showcaseFailed";
  } else {
    query.notice = "showcaseAdded";
  }
  return redirect({ href: { pathname: "/admin/showcase", query }, locale });
}

export async function removeFromShowcase(perfumeId: string) {
  const locale = await getLocale();
  if (!(await isAdmin())) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_showcase_remove", { p_perfume_id: perfumeId });
  revalidateShowcase();

  const query = error
    ? { error: error.code === "23514" ? "showcaseLast" : "showcaseFailed" }
    : { notice: "showcaseRemoved" };
  return redirect({ href: { pathname: "/admin/showcase", query }, locale });
}

/** Swaps the perfume with its neighbour: -1 earlier, 1 later. */
export async function moveInShowcase(perfumeId: string, offset: -1 | 1) {
  if (!(await isAdmin())) return;

  const supabase = await createClient();
  await supabase.rpc("admin_showcase_move", { p_perfume_id: perfumeId, p_offset: offset < 0 ? -1 : 1 });
  revalidateShowcase();
}

// ---------------------------------------------------------------------------
// Admins (owner only; the database checks it too)
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

