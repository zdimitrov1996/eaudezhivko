import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeartIcon, ShelfIcon, StarIcon, TagIcon } from "@/components/icons";
import { PerfumeShowcase } from "@/components/home/PerfumeShowcase";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

const FEATURES = [
  { key: "collection", Icon: ShelfIcon },
  { key: "wishlist", Icon: HeartIcon },
  { key: "ratings", Icon: StarIcon },
  { key: "prices", Icon: TagIcon },
] as const;

export default async function HomePage({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tAccount = await getTranslations("Account");
  const user = await getCurrentUser();
  const { deleted } = await searchParams;

  return (
    <>
      {deleted === "1" && (
        <p role="status" className="mx-auto mt-6 max-w-6xl px-4 text-sm text-moss-200 sm:px-6">
          {tAccount("deleted")}
        </p>
      )}

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] font-semibold text-balance sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-smoke-300">{t("subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            {user ? (
              <Link href="/collection" className="btn btn-primary">
                {t("ctaOpen")}
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-primary">
                  {t("ctaStart")}
                </Link>
                <Link href="/login" className="btn btn-secondary">
                  {t("ctaSignIn")}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* min-w-0: the slide track is eight slides wide and mustn't widen the grid column */}
        <div className="relative min-w-0">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(67_173_118/0.16),transparent)]"
          />
          <PerfumeShowcase />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:mt-32 sm:px-6">
        <h2 className="max-w-xl font-serif text-3xl font-semibold sm:text-4xl">{t("featuresTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, Icon }) => (
            <div key={key} className="card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-moss-900 text-moss-300">
                <Icon />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke-400">{t(`features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
