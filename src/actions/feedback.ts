"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** `error` is a key into the Errors namespace. */
export type FeedbackState = { ok: true; at: number } | { ok: false; error: string } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  // Bots fill every field; people never see this one
  if (String(formData.get("website") ?? "")) return { ok: true, at: Date.now() };

  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };

  const rawCategory = String(formData.get("category") ?? "");
  const category = (FEEDBACK_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : "other";

  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 5) return { ok: false, error: "feedbackTooShort" };
  if (message.length > 2000) return { ok: false, error: "feedbackTooLong" };

  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) return { ok: false, error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", {
    p_category: category,
    p_message: message,
    p_contact_email: contactEmail || null,
    p_page: String(formData.get("page") ?? "").slice(0, 300) || null,
    p_locale: await getLocale(),
    p_user_agent: (await headers()).get("user-agent")?.slice(0, 400) ?? null,
  });

  if (error) {
    return { ok: false, error: error.hint === "rate_limited" ? "rateLimited" : "generic" };
  }
  return { ok: true, at: Date.now() };
}
