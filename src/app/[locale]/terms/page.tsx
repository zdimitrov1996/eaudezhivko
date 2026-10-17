import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { terms } from "@/content/legal";
import { routing } from "@/i18n/routing";

function docFor(locale: string) {
  return terms[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  return { title: docFor(locale).title };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={docFor(locale)} />;
}
