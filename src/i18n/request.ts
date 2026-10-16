import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Dates show in Bulgarian time on every server (Vercel runs in UTC)
    timeZone: "Europe/Sofia",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
