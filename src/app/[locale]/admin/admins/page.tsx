import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { revokeAdmin } from "@/actions/admin";
import { AdminShell, Badge, Notice } from "@/components/admin/AdminShell";
import { GrantAdminForm } from "@/components/admin/GrantAdminForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Link } from "@/i18n/navigation";
import { getAdminAccounts, isOwner, requireAdmin } from "@/lib/admin.server";
import { getCurrentUser } from "@/lib/supabase/server";

const POWERS = ["powersSee", "powersSupport", "powersShowcase", "powersNot"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/admins">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("adminsTitle")} · ${t("title")}`, robots: { index: false, follow: false } };
}

export default async function AdminAdminsPage({ params, searchParams }: PageProps<"/[locale]/admin/admins">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/admins");

  const [t, format, me, owner, admins, query] = await Promise.all([
    getTranslations("Admin"),
    getFormatter(),
    getCurrentUser(),
    isOwner(),
    getAdminAccounts(),
    searchParams,
  ]);

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <AdminShell>
      {query.notice === "adminRevoked" && <Notice>{t("adminRevoked")}</Notice>}
      {query.error === "revokeFailed" && <Notice tone="ember">{t("revokeFailed")}</Notice>}

      <h2 className="font-serif text-3xl font-semibold">{t("adminsTitle")}</h2>
      <p className="mt-1 text-sm text-smoke-400">{owner ? t("adminsIntroOwner") : t("adminsIntroAdmin")}</p>

      <div className="card mt-5 divide-y divide-ink-700">
        {admins.map((admin) => {
          const email = admin.email ?? t("unknownUser");
          return (
            <div key={admin.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/users/${admin.userId}`}
                    className="font-medium break-all text-smoke-100 underline-offset-4 hover:text-moss-300 hover:underline"
                  >
                    {email}
                  </Link>
                  <Badge tone={admin.role === "owner" ? "moss" : "neutral"}>
                    {admin.role === "owner" ? t("ownerBadge") : t("adminBadge")}
                  </Badge>
                  {admin.userId === me?.id && <Badge tone="moss">{t("youBadge")}</Badge>}
                </div>
                <p className="mt-1 text-sm text-smoke-400">
                  {admin.role === "owner"
                    ? t("ownerSince", { date: date(admin.addedAt) })
                    : t("adminSince", { date: date(admin.addedAt), by: admin.addedByEmail ?? t("unknownUser") })}
                </p>
              </div>
              {owner && admin.role === "admin" && (
                <form action={revokeAdmin.bind(null, admin.userId, "admins")}>
                  <ConfirmSubmit
                    message={t("confirmRevoke", { email })}
                    className="btn btn-sm border-ember-400/40 text-ember-400 hover:bg-ember-900/60"
                  >
                    {t("revokeAdmin")}
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {owner && (
        <div className="mt-10">
          <h3 className="font-serif text-2xl font-semibold">{t("grantTitle")}</h3>
          <p className="mt-1 max-w-2xl text-sm text-smoke-400">{t("grantHint")}</p>
          <GrantAdminForm />
        </div>
      )}

      <div className="mt-10 rounded-[1.25rem] border border-ink-600 px-6 py-5">
        <h3 className="font-medium text-smoke-100">{t("powersTitle")}</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-smoke-300 marker:text-smoke-500">
          {POWERS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
