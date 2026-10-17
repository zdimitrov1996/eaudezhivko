import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BottleMark } from "./Logo";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-24 border-t border-ink-700/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-8 pb-3 text-sm text-smoke-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <BottleMark className="h-5 w-5" />
          <span>
            © {new Date().getFullYear()} Eau de Fragrances · {t("tagline")}
          </span>
        </p>
        <nav aria-label={t("legalNav")} className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/faq" className="hover:text-moss-300">
            {t("faq")}
          </Link>
          <Link href="/privacy" className="hover:text-moss-300">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-moss-300">
            {t("terms")}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-24 text-xs text-smoke-500 sm:px-6">
        {t("disclaimer")}
      </div>
    </footer>
  );
}
