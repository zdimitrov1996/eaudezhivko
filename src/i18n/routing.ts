import { hasLocale } from "next-intl";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bg"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

/** `byLocale` in this locale's language, or the default language's for an unknown locale. */
export function pick<T>(byLocale: Record<Locale, T>, locale: string): T {
  return byLocale[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale];
}
