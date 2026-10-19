import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { moveInShowcase, refreshShowcase, removeFromShowcase } from "@/actions/admin";
import { AdminShell, Notice } from "@/components/admin/AdminShell";
import { ShowcaseDialog } from "@/components/admin/ShowcaseDialog";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ChevronLeftIcon, ChevronRightIcon, ExternalIcon } from "@/components/icons";
import { RatingsRefresher } from "@/components/perfumes/RatingsRefresher";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin.server";
import { SHOWCASE_MAX } from "@/lib/showcase";
import { readShowcase } from "@/lib/showcase.server";

const NOTICES = new Set(["showcaseRemoved"]);
const ERRORS = new Set(["showcaseLast", "showcaseFailed"]);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/showcase">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("showcaseTitle")} · ${t("title")}`, robots: { index: false, follow: false } };
}

export default async function AdminShowcasePage({ params, searchParams }: PageProps<"/[locale]/admin/showcase">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/showcase");

  const [t, tc, showcase, query] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Concentration"),
    readShowcase(),
    searchParams,
  ]);
  const notice = typeof query.notice === "string" && NOTICES.has(query.notice) ? query.notice : null;
  const error = typeof query.error === "string" && ERRORS.has(query.error) ? query.error : null;
  const full = showcase.length >= SHOWCASE_MAX;

  return (
    <AdminShell>
      {notice && <Notice>{t(notice)}</Notice>}
      {error && <Notice tone="ember">{t(error)}</Notice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold">{t("showcaseTitle")}</h2>
          <p className="mt-1 text-sm text-smoke-400">
            {full ? t("showcaseFull") : t("showcaseIntro", { count: showcase.length, max: SHOWCASE_MAX })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShowcaseDialog disabled={full} />
          <Link href="/" target="_blank" className="btn btn-secondary btn-sm">
            {t("showcaseViewHome")}
            <ExternalIcon className="text-smoke-400" />
          </Link>
        </div>
      </div>

      {showcase.length === 0 ? (
        <p className="card mt-5 px-5 py-4 text-sm text-smoke-400">{t("showcaseEmpty")}</p>
      ) : (
        <ol className="card mt-5 divide-y divide-ink-700">
          {showcase.map((perfume, index) => {
            const name = `${perfume.brand} ${perfume.name}`;
            const details = [
              perfume.concentration ? tc(perfume.concentration) : null,
              perfume.parfumoRating !== null ? `Parfumo ${perfume.parfumoRating.toFixed(1)}/10` : null,
            ].filter(Boolean);
            return (
              <li key={perfume.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <span className="w-5 shrink-0 text-right text-sm text-smoke-500 tabular-nums">{index + 1}</span>
                <span className="stage isolate h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-600 p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={perfume.imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-contain mix-blend-multiply"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold tracking-[0.12em] text-smoke-400 uppercase">
                    {perfume.brand}
                  </p>
                  <a
                    href={perfume.parfumoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-smoke-100 underline-offset-4 hover:text-moss-300 hover:underline"
                  >
                    {perfume.name}
                  </a>
                  <p className="truncate text-xs text-smoke-400">{details.join(" · ")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ShowcaseDialog perfume={perfume} />
                  <form action={moveInShowcase.bind(null, perfume.id, -1)}>
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={t("moveUp", { name })}
                      className="btn btn-ghost btn-sm !px-2"
                    >
                      <ChevronLeftIcon className="rotate-90" />
                    </button>
                  </form>
                  <form action={moveInShowcase.bind(null, perfume.id, 1)}>
                    <button
                      type="submit"
                      disabled={index === showcase.length - 1}
                      aria-label={t("moveDown", { name })}
                      className="btn btn-ghost btn-sm !px-2"
                    >
                      <ChevronRightIcon className="rotate-90" />
                    </button>
                  </form>
                  <form action={removeFromShowcase.bind(null, perfume.id)}>
                    <ConfirmSubmit
                      message={t("confirmRemoveShowcase", { name })}
                      disabled={showcase.length <= 1}
                      className="btn btn-ghost btn-sm text-ember-400"
                    >
                      {t("removeFromShowcase")}
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Re-reads Parfumo for slides whose picture and rating are over a week old */}
      <RatingsRefresher ids={showcase.map((perfume) => perfume.id)} refresh={refreshShowcase} />
    </AdminShell>
  );
}
