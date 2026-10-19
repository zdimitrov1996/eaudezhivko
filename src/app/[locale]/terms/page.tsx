import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { terms } from "@/content/legal";
import { pick } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">): Promise<Metadata> {
  return { title: pick(terms, (await params).locale).title };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={pick(terms, locale)} />;
}
