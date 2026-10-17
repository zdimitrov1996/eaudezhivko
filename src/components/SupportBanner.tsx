import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { signOut } from "@/actions/auth";
import { SUPPORT_SESSION_COOKIE } from "@/lib/impersonation";
import type { CurrentUser } from "@/lib/supabase/server";

/** Shown while an admin is signed in as another user. */
export async function SupportBanner({ user }: { user: CurrentUser }) {
  const supportFor = (await cookies()).get(SUPPORT_SESSION_COOKIE)?.value;
  if (supportFor !== user.id) return null;

  const t = await getTranslations("Support");

  return (
    <div role="status" className="bg-ember-900 text-ember-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
        <span>{t("banner", { email: user.email ?? user.id })}</span>
        <form action={signOut}>
          <button type="submit" className="btn btn-sm !min-h-8 border-ember-400/40 text-ember-400 hover:bg-veil">
            {t("exit")}
          </button>
        </form>
      </div>
    </div>
  );
}
