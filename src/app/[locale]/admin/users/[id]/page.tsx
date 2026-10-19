import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { deleteUserAsAdmin, grantAdminToUser, impersonateUser, revokeAdmin } from "@/actions/admin";
import { AdminShell, AdminTable, Badge, Notice, Td, Th } from "@/components/admin/AdminShell";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ArrowIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import {
  getAdminAccounts,
  getAdminUser,
  getAdminUserShelves,
  isOwner,
  requireAdmin,
  type AdminShelfEntry,
} from "@/lib/admin.server";
import { isAdminApiConfigured } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

const PAGE_ERRORS = new Set(["noSecretKey", "impersonateFailed", "deleteFailed", "revokeFailed"]);
const GRANT_ERRORS = new Set(["notFound", "notConfirmed", "alreadyAdmin", "notOwner", "generic"]);
const PAGE_NOTICES = new Set(["adminGranted", "adminRevoked"]);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/users/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminUserPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, `/admin/users/${id}`);

  const user = await getAdminUser(id);
  if (!user) notFound();

  const [t, tc, format, me, entries, query, owner] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Concentration"),
    getFormatter(),
    getCurrentUser(),
    getAdminUserShelves(user.id),
    searchParams,
    isOwner(),
  ]);
  // Only the owner sees the rights section, so only the owner needs the roles
  const role = owner && user.isAdmin ? (await getAdminAccounts()).find((a) => a.userId === user.id)?.role : null;

  const dateTime = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const provider = (name: string) =>
    name === "email" ? t("providerEmail") : name.charAt(0).toUpperCase() + name.slice(1);
  const rawError = typeof query.error === "string" ? query.error : "";
  const error = PAGE_ERRORS.has(rawError)
    ? t(rawError)
    : rawError.startsWith("grant_") && GRANT_ERRORS.has(rawError.slice(6))
      ? t(`grantErrors.${rawError.slice(6)}`)
      : null;
  const notice = typeof query.notice === "string" && PAGE_NOTICES.has(query.notice) ? query.notice : null;

  const isSelf = user.id === me?.id;
  const email = user.email ?? user.id;
  const collection = entries.filter((entry) => entry.shelf === "collection");
  const wishlist = entries.filter((entry) => entry.shelf === "wishlist");

  const shelfTable = (rows: AdminShelfEntry[]) => {
    if (rows.length === 0) {
      return <p className="card px-5 py-4 text-sm text-smoke-400">{t("emptyShelf")}</p>;
    }
    return (
      <AdminTable>
        <thead>
          <tr>
            <Th>{t("colPerfume")}</Th>
            <Th>{t("colConcentration")}</Th>
            <Th align="right">{t("colYear")}</Th>
            <Th align="right">{t("colRating")}</Th>
            <Th>{t("colAdded")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id} className="hover:bg-veil-soft">
              <Td>
                <span className="text-smoke-400">{entry.perfume.brand}</span>{" "}
                <span className="font-medium text-smoke-100">{entry.perfume.name}</span>
              </Td>
              <Td className="whitespace-nowrap text-smoke-300">
                {entry.perfume.concentration ? tc(entry.perfume.concentration) : "—"}
              </Td>
              <Td align="right">{entry.perfume.releaseYear ?? "—"}</Td>
              <Td align="right">{entry.rating ? `${entry.rating}/10` : "—"}</Td>
              <Td className="whitespace-nowrap text-smoke-300">{dateTime(entry.addedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    );
  };

  return (
    <AdminShell>
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-smoke-400 hover:text-moss-300">
        <ArrowIcon className="h-4 w-4 rotate-180" />
        {t("backToUsers")}
      </Link>

      <div className="card mt-4 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-3xl font-semibold break-all">{email}</h2>
          {isSelf && <Badge tone="moss">{t("youBadge")}</Badge>}
          {user.isAdmin && !isSelf && <Badge tone="moss">{t("adminBadge")}</Badge>}
          {!user.emailConfirmed && <Badge tone="ember">{t("unconfirmed")}</Badge>}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-smoke-400">
          <span>{t("userRegistered", { date: dateTime(user.createdAt) })}</span>
          <span>
            {t("userLastSignIn", { date: user.lastSignInAt ? dateTime(user.lastSignInAt) : t("never") })}
          </span>
          <span>
            {t("colMethod")}: {user.providers.map(provider).join(", ") || "—"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {error && <Notice tone="ember">{error}</Notice>}
        {notice && <Notice>{t(notice)}</Notice>}

        <div className="rounded-[1.25rem] border border-ink-600 px-6 py-5">
          <h3 className="font-medium text-smoke-100">{t("supportTitle")}</h3>

          {isSelf ? (
            <p className="mt-2 text-sm text-smoke-400">{t("selfProtected")}</p>
          ) : user.isAdmin ? (
            <p className="mt-2 text-sm text-smoke-400">{t("adminProtected")}</p>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <form action={impersonateUser.bind(null, user.id)}>
                <ConfirmSubmit
                  message={t("confirmImpersonate", { email })}
                  disabled={!isAdminApiConfigured}
                  className="btn btn-secondary btn-sm"
                >
                  {t("impersonate")}
                </ConfirmSubmit>
                <p className="mt-2 text-sm text-smoke-400">
                  {isAdminApiConfigured ? t("impersonateHint") : t("noSecretKey")}
                </p>
              </form>
              <form action={deleteUserAsAdmin.bind(null, user.id)}>
                <ConfirmSubmit
                  message={t("confirmDelete", { email })}
                  className="btn btn-sm border-ember-400/40 text-ember-400 hover:bg-ember-900/60"
                >
                  {t("deleteUser")}
                </ConfirmSubmit>
                <p className="mt-2 text-sm text-smoke-400">{t("deleteHint")}</p>
              </form>
            </div>
          )}
        </div>
      </div>

      {owner && !isSelf && (
        <div className="mt-6 rounded-[1.25rem] border border-ink-600 px-6 py-5">
          <h3 className="font-medium text-smoke-100">{t("rightsTitle")}</h3>
          {role === "owner" ? (
            <p className="mt-2 text-sm text-smoke-400">{t("rightsOwner")}</p>
          ) : user.isAdmin ? (
            <form action={revokeAdmin.bind(null, user.id, "user")} className="mt-4">
              <ConfirmSubmit
                message={t("confirmRevoke", { email })}
                className="btn btn-sm border-ember-400/40 text-ember-400 hover:bg-ember-900/60"
              >
                {t("revokeAdmin")}
              </ConfirmSubmit>
            </form>
          ) : (
            <form action={grantAdminToUser.bind(null, user.id, user.email ?? "")} className="mt-4">
              <ConfirmSubmit
                message={t("confirmGrant", { email })}
                disabled={!user.emailConfirmed || !user.email}
                className="btn btn-secondary btn-sm"
              >
                {t("grantSubmit")}
              </ConfirmSubmit>
              <p className="mt-2 text-sm text-smoke-400">
                {user.emailConfirmed ? t("rightsGrantHint") : t("grantErrors.notConfirmed")}
              </p>
            </form>
          )}
        </div>
      )}

      <h3 className="mt-10 mb-4 font-serif text-2xl font-semibold">
        {t("collectionTitle", { count: collection.length })}
      </h3>
      {shelfTable(collection)}

      <h3 className="mt-10 mb-4 font-serif text-2xl font-semibold">
        {t("wishlistTitle", { count: wishlist.length })}
      </h3>
      {shelfTable(wishlist)}
    </AdminShell>
  );
}
