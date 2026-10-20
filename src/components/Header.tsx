import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { getUnreadNotificationCount } from "@/lib/notifications.server";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Theme } from "@/lib/theme";
import { BellIcon, DropIcon, HeartIcon, ShelfIcon, UserIcon } from "./icons";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { SupportBanner } from "./SupportBanner";
import { ThemeToggle } from "./ThemeToggle";

export async function Header({ theme }: { theme: Theme }) {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const unread = user ? await getUnreadNotificationCount() : 0;

  // Icons are left out on phones, where three labels need the whole width
  const nav = (
    <>
      <NavLink href="/collection">
        <ShelfIcon className="max-sm:hidden" />
        {t("collection")}
      </NavLink>
      <NavLink href="/wishlist">
        <HeartIcon className="max-sm:hidden" />
        {t("wishlist")}
      </NavLink>
      <NavLink href="/finished">
        <DropIcon className="max-sm:hidden" />
        {t("finished")}
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

        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <nav aria-label={t("mainNav")} className="mr-1 hidden items-center gap-1 md:flex">
              {nav}
            </nav>
          )}

          <ThemeToggle initial={theme} />
          <Suspense>
            <LocaleSwitcher />
          </Suspense>

          {user && (
            <Link
              href="/notifications"
              aria-label={unread > 0 ? t("notificationsUnread", { count: unread }) : t("notifications")}
              title={t("notifications")}
              className="btn btn-ghost btn-sm relative !px-2 sm:!px-2.5"
            >
              <BellIcon />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-moss-400 px-1 text-[10px] leading-none font-semibold text-ink-900"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <Link
              href="/account"
              aria-label={t("account")}
              title={user.email ?? t("account")}
              className="btn btn-ghost btn-sm !px-2 sm:!px-2.5"
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
