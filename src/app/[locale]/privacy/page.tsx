import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { privacy } from "@/content/legal";
import { routing } from "@/i18n/routing";

function docFor(locale: string) {
  return privacy[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  return { title: docFor(locale).title };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={docFor(locale)} />;
}
