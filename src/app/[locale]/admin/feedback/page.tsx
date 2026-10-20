import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { deleteFeedback, setFeedbackStatus } from "@/actions/admin";
import { AdminShell, Badge } from "@/components/admin/AdminShell";
import { FeedbackDoneDialog } from "@/components/admin/FeedbackDoneDialog";
import { SubmitButton } from "@/components/auth/FormBits";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Link } from "@/i18n/navigation";
import { getAdminFeedback, requireAdmin } from "@/lib/admin.server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/feedback">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("feedbackTitle")} · ${t("title")}`, robots: { index: false, follow: false } };
}

export default async function AdminFeedbackPage({ params }: PageProps<"/[locale]/admin/feedback">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/feedback");

  const [t, tf, format, items] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Feedback"),
    getFormatter(),
    getAdminFeedback(),
  ]);

  const newCount = items.filter((item) => item.status === "new").length;

  return (
    <AdminShell>
      <h2 className="font-serif text-3xl font-semibold">{t("feedbackTitle")}</h2>
      <p className="mt-1 mb-5 text-sm text-smoke-400">
        {t("feedbackCount", { count: items.length })}
        {newCount > 0 && <> · {t("feedbackNewCount", { count: newCount })}</>}
      </p>

      {items.length === 0 ? (
        <p className="card px-5 py-4 text-sm text-smoke-400">{t("emptyFeedback")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className={`card px-5 py-4 ${
                item.status === "new" ? "border-moss-800" : item.status === "done" ? "opacity-70" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.category === "bug" ? "ember" : item.category === "idea" ? "moss" : "neutral"}>
                    {tf(`categories.${item.category}`)}
                  </Badge>
                  <Badge tone={item.status === "done" ? "neutral" : "moss"}>{t(`feedbackStatus.${item.status}`)}</Badge>
                </div>
                <span className="text-sm text-smoke-500">
                  {format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-smoke-100">{item.message}</p>

              <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-smoke-500">{t("feedbackFrom")}</dt>
                <dd className="min-w-0 break-words text-smoke-300">
                  {item.userId && item.userEmail ? (
                    <Link href={`/admin/users/${item.userId}`} className="hover:text-moss-300 hover:underline">
                      {item.userEmail}
                    </Link>
                  ) : (
                    t("feedbackGuest")
                  )}
                  {item.contactEmail && (
                    <>
                      {" · "}
                      <a href={`mailto:${item.contactEmail}`} className="text-moss-300 hover:underline">
                        {t("feedbackReplyTo", { email: item.contactEmail })}
                      </a>
                    </>
                  )}
                </dd>
                {item.page && (
                  <>
                    <dt className="text-smoke-500">{t("feedbackPage")}</dt>
                    <dd className="min-w-0 break-all text-smoke-300">
                      {item.locale ? `/${item.locale}` : ""}
                      {item.page}
                    </dd>
                  </>
                )}
                {item.userAgent && (
                  <>
                    <dt className="text-smoke-500">{t("feedbackBrowser")}</dt>
                    <dd className="min-w-0 truncate text-xs text-smoke-500" title={item.userAgent}>
                      {item.userAgent}
                    </dd>
                  </>
                )}
              </dl>

              {item.resolutionNote && (
                <div className="mt-4 rounded-xl border border-ink-600/70 bg-ink-900/40 px-4 py-3 text-sm">
                  <p className="text-smoke-500">{t("feedbackResolution")}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-smoke-200">{item.resolutionNote}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "new" && (
                  <form action={setFeedbackStatus.bind(null, item.id, "in_progress")}>
                    <SubmitButton className="btn btn-secondary btn-sm">{t("markInProgress")}</SubmitButton>
                  </form>
                )}
                {item.status !== "done" && (
                  <FeedbackDoneDialog id={item.id} excerpt={item.message} notifies={Boolean(item.userId)} />
                )}
                {item.status !== "new" && (
                  <form action={setFeedbackStatus.bind(null, item.id, "new")}>
                    <SubmitButton className="btn btn-ghost btn-sm">{t("markNew")}</SubmitButton>
                  </form>
                )}
                <form action={deleteFeedback.bind(null, item.id)}>
                  <ConfirmSubmit message={t("confirmDeleteFeedback")} className="btn btn-ghost btn-sm text-ember-400">
                    {t("deleteFeedback")}
                  </ConfirmSubmit>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
