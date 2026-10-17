import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LEGAL_OWNER, type LegalDoc } from "@/content/legal";
import { routing } from "@/i18n/routing";

/** Turns bare https:// addresses (new tab) and email addresses (mailto) in a text into links. */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s,;)]+|[\w.+-]+@[\w-]+\.[\w.]+\w)/g);
  return parts.map((part, index) =>
    /^[\w.+-]+@[\w-]+\.[\w.]+\w$/.test(part) ? (
      <a key={index} href={`mailto:${part}`} className="text-moss-300 underline underline-offset-4 hover:text-moss-200">
        {part}
      </a>
    ) : /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-moss-300 underline underline-offset-4 hover:text-moss-200"
      >
        {part.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    ) : (
      part
    ),
  );
}

export function LegalShell({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-smoke-500">{updated}</p>}
      <p className="mt-6 text-lg leading-relaxed text-smoke-300">{intro}</p>
      <div className="mt-10">{children}</div>
    </article>
  );
}

export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations("Legal");
  const locale = await getLocale();
  const ownerName = LEGAL_OWNER.name[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale];

  return (
    <LegalShell title={doc.title} intro={doc.intro} updated={t("updated", { date: doc.updated })}>
      <div className="flex flex-col gap-9">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-serif text-2xl font-semibold text-smoke-100">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed text-smoke-300">
                <Linkified text={paragraph} />
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-relaxed text-smoke-300 marker:text-moss-400">
                {section.list.map((item) => (
                  <li key={item}>
                    <Linkified text={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="card px-6 py-5">
          <h2 className="font-serif text-2xl font-semibold">{t("contactTitle")}</h2>
          <p className="mt-2 font-medium text-smoke-100">{ownerName}</p>
          <p className="mt-1">
            <a href={`mailto:${LEGAL_OWNER.email}`} className="text-moss-300 underline underline-offset-4">
              {LEGAL_OWNER.email}
            </a>
          </p>
          <p className="mt-3 leading-relaxed text-smoke-400">{t("contactFeedback")}</p>
        </section>
      </div>
    </LegalShell>
  );
}
