import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalShell } from "@/components/LegalPage";
import { faq } from "@/content/legal";
import { pick } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  return { title: pick(faq, (await params).locale).title };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = pick(faq, locale);

  return (
    <LegalShell title={content.title} intro={content.intro}>
      <div className="flex flex-col gap-3">
        {content.items.map((item) => (
          <details key={item.q} className="card group px-5 py-4 open:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-smoke-100 [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden="true"
                className="text-xl leading-none text-moss-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-smoke-300">{item.a}</p>
          </details>
        ))}
      </div>
    </LegalShell>
  );
}
