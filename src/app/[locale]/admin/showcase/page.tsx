import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { addToShowcase, moveInShowcase, removeFromShowcase } from "@/actions/admin";
import { AdminShell, Badge, Notice } from "@/components/admin/AdminShell";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ChevronLeftIcon, ChevronRightIcon, ExternalIcon } from "@/components/icons";
import { RatingsRefresher } from "@/components/perfumes/RatingsRefresher";
import { Link } from "@/i18n/navigation";
import { getAdminShowcase, requireAdmin, searchCatalogue } from "@/lib/admin.server";
import type { Perfume } from "@/lib/perfumes";
import { SHOWCASE_MAX } from "@/lib/showcase";

const NOTICES = new Set(["showcaseAdded", "showcaseRemoved"]);
const ERRORS = new Set(["showcaseFull", "showcaseNeedsPicture", "showcaseLast", "showcaseFailed"]);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/showcase">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("showcaseTitle")} · ${t("title")}`, robots: { index: false, follow: false } };
}

/** Small bottle photo on the light stage, like the homepage thumbnails. */
function Thumb({ perfume }: { perfume: Perfume }) {
  return (
    <span className="stage isolate grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-600 p-0.5">
      {perfume.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={perfume.imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-contain mix-blend-multiply"
        />
      ) : (
        <span aria-hidden="true" className="font-serif text-xl font-semibold text-moss-600">
          {perfume.brand.charAt(0)}
        </span>
      )}
    </span>
  );
}

export default async function AdminShowcasePage({ params, searchParams }: PageProps<"/[locale]/admin/showcase">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/showcase");

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const notice = typeof query.notice === "string" && NOTICES.has(query.notice) ? query.notice : null;
  const error = typeof query.error === "string" && ERRORS.has(query.error) ? query.error : null;

  const [t, tc, showcase, results] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Concentration"),
    getAdminShowcase(),
    searchCatalogue(search),
  ]);

  const inShowcase = new Set(showcase.map((perfume) => perfume.id));
  const full = showcase.length >= SHOWCASE_MAX;
  const details = (perfume: Perfume) =>
    [
      perfume.concentration ? tc(perfume.concentration) : null,
      perfume.parfumoRating !== null ? `Parfumo ${perfume.parfumoRating.toFixed(1)}/10` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <AdminShell>
      {notice && <Notice>{t(notice)}</Notice>}
      {error && <Notice tone="ember">{t(error)}</Notice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold">{t("showcaseTitle")}</h2>
          <p className="mt-1 text-sm text-smoke-400">
            {t("showcaseIntro", { count: showcase.length, max: SHOWCASE_MAX })}
          </p>
        </div>
        <Link href="/" target="_blank" className="btn btn-secondary btn-sm">
          {t("showcaseViewHome")}
          <ExternalIcon className="text-smoke-400" />
        </Link>
      </div>

      {showcase.length === 0 ? (
        <p className="card mt-5 px-5 py-4 text-sm text-smoke-400">{t("showcaseEmpty")}</p>
      ) : (
        <ol className="card mt-5 divide-y divide-ink-700">
          {showcase.map((perfume, index) => {
            const name = `${perfume.brand} ${perfume.name}`;
            return (
              <li key={perfume.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <span className="w-5 shrink-0 text-right text-sm text-smoke-500 tabular-nums">{index + 1}</span>
                <Thumb perfume={perfume} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold tracking-[0.12em] text-smoke-400 uppercase">
                    {perfume.brand}
                  </p>
                  <p className="truncate font-medium text-smoke-100">{perfume.name}</p>
                  <p className="truncate text-xs text-smoke-400">{details(perfume)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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

      <h3 className="mt-12 font-serif text-2xl font-semibold">{t("showcaseAddTitle")}</h3>
      <p className="mt-1 max-w-2xl text-sm text-smoke-400">{t("showcaseAddHint")}</p>
      <form role="search" className="mt-4 flex w-full gap-2 sm:w-auto">
        <label htmlFor="showcase-search" className="sr-only">
          {t("showcaseSearchLabel")}
        </label>
        <input
          id="showcase-search"
          name="q"
          type="search"
          defaultValue={search}
          placeholder={t("showcaseSearchPlaceholder")}
          className="field !min-h-10 sm:w-80"
        />
        <button type="submit" className="btn btn-secondary btn-sm !min-h-10">
          {t("search")}
        </button>
        {search && (
          <Link href="/admin/showcase" className="btn btn-ghost btn-sm !min-h-10">
            {t("clear")}
          </Link>
        )}
      </form>

      {search.trim().length >= 2 && (
        <ul className="card mt-4 divide-y divide-ink-700">
          {results.length === 0 && <li className="px-5 py-4 text-sm text-smoke-400">{t("showcaseNoResults")}</li>}
          {results.map((perfume) => {
            const usable = Boolean(perfume.parfumoUrl && perfume.imageUrl);
            return (
              <li key={perfume.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <Thumb perfume={perfume} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold tracking-[0.12em] text-smoke-400 uppercase">
                    {perfume.brand}
                  </p>
                  <p className="truncate font-medium text-smoke-100">{perfume.name}</p>
                  <p className="truncate text-xs text-smoke-400">{details(perfume)}</p>
                </div>
                {inShowcase.has(perfume.id) ? (
                  <Badge tone="moss">{t("showcaseInCarousel")}</Badge>
                ) : !usable ? (
                  <Badge>{t("showcaseNoPicture")}</Badge>
                ) : (
                  <form action={addToShowcase.bind(null, perfume.id, search)}>
                    <button type="submit" disabled={full} className="btn btn-secondary btn-sm">
                      {t("showcaseAdd")}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Fills in missing or week-old Parfumo ratings for the slides */}
      <RatingsRefresher perfumeIds={showcase.map((perfume) => perfume.id)} />
    </AdminShell>
  );
}
