import { useTranslations } from "next-intl";
import { BottleMark } from "./Logo";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-24 border-t border-ink-700/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-smoke-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <BottleMark className="h-5 w-5" />
          <span>
            © {new Date().getFullYear()} Eau de Fragrances · {t("tagline")}
          </span>
        </p>
        <p className="text-smoke-500">{t("disclaimer")}</p>
      </div>
    </footer>
  );
}
