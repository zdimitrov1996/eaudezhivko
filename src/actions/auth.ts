"use server";

import { getLocale } from "next-intl/server";
import { redirect as externalRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeNextPath } from "@/lib/site-url";

/** `error` and `message` are keys into the Errors / Auth translation namespaces. */
export type AuthState = { error?: string; message?: string } | undefined;

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  user_already_exists: "userExists",
  email_exists: "userExists",
  weak_password: "weakPassword",
  same_password: "samePassword",
  email_address_invalid: "invalidEmail",
  over_email_send_rate_limit: "rateLimited",
  over_request_rate_limit: "rateLimited",
};

function errorKey(error: { code?: string } | null) {
  return ERROR_KEYS[error?.code ?? ""] ?? "generic";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

/** Where to land after signing in, without the locale prefix (e.g. "/collection"). */
function nextPath(formData: FormData) {
  return safeNextPath(formData.get("next"), "/collection");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "missingFields" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: errorKey(error) };

  return redirect({ href: nextPath(formData), locale: await getLocale() });
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "missingFields" };
  if (!EMAIL_PATTERN.test(email)) return { error: "invalidEmail" };
  if (password.length < MIN_PASSWORD_LENGTH) return { error: "weakPassword" };

  const locale = await getLocale();
  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/${locale}/collection`,
    },
  });
  if (error) return { error: errorKey(error) };

  // Email confirmation switched off in Supabase: the user is signed in already
  if (data.session) return redirect({ href: "/collection", locale });

  return { message: "checkEmail" };
}

export async function signInWithGoogle(formData: FormData) {
  const locale = await getLocale();
  if (!isSupabaseConfigured) {
    return redirect({ href: { pathname: "/login", query: { error: "notConfigured" } }, locale });
  }

  const siteUrl = await getSiteUrl();
  const next = `/${locale}${nextPath(formData)}`;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return redirect({ href: { pathname: "/login", query: { error: "oauth" } }, locale });
  }

  externalRedirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return { error: "invalidEmail" };

  const locale = await getLocale();
  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/${locale}/reset-password`,
  });
  // Don't reveal whether the email has an account; only surface rate limits
  if (error?.code === "over_email_send_rate_limit") return { error: "rateLimited" };

  return { message: "resetSent" };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: "weakPassword" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "session_not_found" ? "linkInvalid" : errorKey(error) };
  }

  return { message: "passwordUpdated" };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return redirect({ href: "/", locale: await getLocale() });
}

export async function deleteAccount() {
  const locale = await getLocale();
  if (!isSupabaseConfigured) return redirect({ href: "/", locale });

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    return redirect({ href: { pathname: "/account", query: { error: "generic" } }, locale });
  }

  // The user row is gone; clear the session cookies locally
  await supabase.auth.signOut({ scope: "local" });
  return redirect({ href: { pathname: "/", query: { deleted: "1" } }, locale });
}
