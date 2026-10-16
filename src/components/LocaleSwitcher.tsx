"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = { en: "EN", bg: "BG" };

export function LocaleSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    const query = Object.fromEntries(searchParams.entries());
    startTransition(() => {
      router.replace({ pathname, query }, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex rounded-full border border-ink-600 p-0.5 text-xs font-semibold"
    >
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          disabled={isPending}
          aria-pressed={code === locale}
          className={`rounded-full px-2.5 py-1.5 transition-colors ${
            code === locale
              ? "bg-ink-600 text-smoke-100"
              : "text-smoke-400 hover:text-smoke-100"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
