import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">{t("title")}</h1>
      <p className="mt-4 text-smoke-400">{t("body")}</p>
      <Link href="/" className="btn btn-secondary mt-8">
        {t("home")}
      </Link>
    </section>
  );
}
