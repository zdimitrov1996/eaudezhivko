import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { HeartIcon, ShelfIcon, UserIcon } from "./icons";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { SupportBanner } from "./SupportBanner";

export async function Header() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();

  const nav = (
    <>
      <NavLink href="/collection">
        <ShelfIcon />
        {t("collection")}
      </NavLink>
      <NavLink href="/wishlist">
        <HeartIcon />
        {t("wishlist")}
      </NavLink>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/80 bg-ink-900/85 backdrop-blur-md">
      {user && <SupportBanner user={user} />}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Eau de Fragrances" className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <nav aria-label={t("mainNav")} className="mr-1 hidden items-center gap-1 md:flex">
              {nav}
            </nav>
          )}

          <Suspense>
            <LocaleSwitcher />
          </Suspense>

          {user ? (
            <Link
              href="/account"
              aria-label={t("account")}
              title={user.email ?? t("account")}
              className="btn btn-ghost btn-sm !px-2.5"
            >
              <UserIcon />
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                {t("signIn")}
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex">
                {t("signUp")}
              </Link>
            </>
          )}
        </div>
      </div>

      {user && (
        <nav
          aria-label={t("mainNav")}
          className="flex items-center gap-1 border-t border-ink-700/60 px-4 py-2 md:hidden"
        >
          {nav}
        </nav>
      )}
    </header>
  );
}
