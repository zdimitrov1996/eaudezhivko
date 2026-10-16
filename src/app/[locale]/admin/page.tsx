import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, AdminTable, Badge, Notice, Td, Th } from "@/components/admin/AdminShell";
import { Link } from "@/i18n/navigation";
import {
  getAdminOverview,
  getAdminUsers,
  getRecentAdminActions,
  requireAdmin,
  type AdminOverview,
} from "@/lib/admin.server";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const STATS: (keyof AdminOverview)[] = [
  "newFeedback",
  "totalUsers",
  "newUsers7d",
  "catalogPerfumes",
  "collectionEntries",
  "wishlistEntries",
  "ratingsGiven",
];

export default async function AdminPage({ params, searchParams }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin");

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : "";

  const [t, format, me, overview, users, actions] = await Promise.all([
    getTranslations("Admin"),
    getFormatter(),
    getCurrentUser(),
    getAdminOverview(),
    getAdminUsers(search),
    getRecentAdminActions(),
  ]);

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const dateTime = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const provider = (name: string) =>
    name === "email" ? t("providerEmail") : name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <AdminShell>
      {query.deleted === "1" && <Notice>{t("deletedNotice")}</Notice>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STATS.map((key) => {
          const tile = (
            <>
              <p className="text-3xl font-semibold tabular-nums text-smoke-100">
                {format.number(overview[key])}
              </p>
              <p className="mt-1 text-xs leading-snug text-smoke-400">{t(`stats.${key}`)}</p>
            </>
          );
          return key === "newFeedback" ? (
            <Link
              key={key}
              href="/admin/feedback"
              className={`card block px-4 py-4 hover:border-moss-600 ${
                overview.newFeedback > 0 ? "border-moss-800 bg-moss-900/30" : ""
              }`}
            >
              {tile}
            </Link>
          ) : (
            <div key={key} className="card px-4 py-4">
              {tile}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold">{t("usersTitle")}</h2>
          <p className="mt-1 text-sm text-smoke-400">{t("showingCount", { count: users.length })}</p>
        </div>
        <form role="search" className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="admin-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder={t("searchPlaceholder")}
            className="field !min-h-10 sm:w-72"
          />
          <button type="submit" className="btn btn-secondary btn-sm !min-h-10">
            {t("search")}
          </button>
          {search && (
            <Link href="/admin" className="btn btn-ghost btn-sm !min-h-10">
              {t("clear")}
            </Link>
          )}
        </form>
      </div>

      <div className="mt-5">
        <AdminTable>
          <thead>
            <tr>
              <Th>{t("colEmail")}</Th>
              <Th>{t("colRegistered")}</Th>
              <Th>{t("colLastSignIn")}</Th>
              <Th>{t("colMethod")}</Th>
              <Th align="right">{t("colCollection")}</Th>
              <Th align="right">{t("colWishlist")}</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-smoke-400">{t("noUsers")}</Td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.03]">
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-smoke-100 underline-offset-4 hover:text-moss-300 hover:underline"
                    >
                      {user.email ?? user.id}
                    </Link>
                    {user.id === me?.id && <Badge tone="moss">{t("youBadge")}</Badge>}
                    {user.isAdmin && user.id !== me?.id && <Badge tone="moss">{t("adminBadge")}</Badge>}
                    {!user.emailConfirmed && <Badge tone="ember">{t("unconfirmed")}</Badge>}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-smoke-300">{date(user.createdAt)}</Td>
                <Td className="whitespace-nowrap text-smoke-300">
                  {user.lastSignInAt ? dateTime(user.lastSignInAt) : t("never")}
                </Td>
                <Td className="whitespace-nowrap text-smoke-300">
                  {user.providers.map(provider).join(", ") || "—"}
                </Td>
                <Td align="right">{user.collectionCount}</Td>
                <Td align="right">{user.wishlistCount}</Td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </div>

      <h2 className="mt-12 font-serif text-3xl font-semibold">{t("recentActionsTitle")}</h2>
      <div className="card mt-5 divide-y divide-ink-700">
        {actions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-smoke-400">{t("noActions")}</p>
        ) : (
          actions.map((action) => {
            const values = {
              admin: action.adminEmail ?? t("unknownUser"),
              target: action.targetEmail ?? t("unknownUser"),
            };
            return (
              <div key={action.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <Badge tone={action.action === "delete_user" ? "ember" : "neutral"}>
                    {action.action === "delete_user" ? t("deleteUser") : t("impersonate")}
                  </Badge>
                  <span className="text-smoke-200">
                    {action.action === "delete_user"
                      ? t("actionDelete", values)
                      : t("actionImpersonate", values)}
                  </span>
                </span>
                <span className="text-smoke-500">{dateTime(action.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
