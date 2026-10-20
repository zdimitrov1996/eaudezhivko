import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { markNotificationsRead } from "@/actions/notifications";
import { BellIcon } from "@/components/icons";
import { NotificationList } from "@/components/NotificationList";
import { redirect } from "@/i18n/navigation";
import { getNotifications } from "@/lib/notifications.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/notifications">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Notifications" });
  return { title: t("title") };
}

/** What happened to the user's feedback; opening the page marks everything read. */
export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = isSupabaseConfigured ? await getCurrentUser() : null;
  if (!user) return redirect({ href: { pathname: "/login", query: { next: "/notifications" } }, locale });

  const [t, format, items] = await Promise.all([getTranslations("Notifications"), getFormatter(), getNotifications()]);

  return (
    <section className="mx-auto max-w-2xl px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
      <p className="mt-2 text-smoke-400">{t("subtitle")}</p>

      {items.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-moss-900 text-moss-300">
            <BellIcon width="26" height="26" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-md text-smoke-400">{t("emptyBody")}</p>
        </div>
      ) : (
        <NotificationList
          markRead={markNotificationsRead}
          items={items.map((item) => ({
            ...item,
            dateLabel: format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" }),
          }))}
        />
      )}
    </section>
  );
}
