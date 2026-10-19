import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { privacy } from "@/content/legal";
import { pick } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  return { title: pick(privacy, (await params).locale).title };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={pick(privacy, locale)} />;
}
