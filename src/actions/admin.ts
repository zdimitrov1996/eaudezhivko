"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin.server";
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
