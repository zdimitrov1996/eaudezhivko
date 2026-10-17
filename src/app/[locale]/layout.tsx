import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/supabase/server";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: { default: t("title"), template: `%s · Eau de Fragrances` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    // suppressHydrationWarning: browser extensions add attributes to <html>/<body>
    // before React hydrates; this only silences attribute diffs on these two tags.
    <html
      lang={locale}
      data-theme={theme}
      className={`${inter.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FeedbackButton signedIn={Boolean(user)} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
