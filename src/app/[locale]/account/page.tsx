import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteAccount, signOut } from "@/actions/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { FormMessage } from "@/components/auth/FormBits";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("title") };
}

export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return redirect({ href: { pathname: "/login", query: { next: "/account" } }, locale });

  const t = await getTranslations("Account");
  const tNav = await getTranslations("Nav");
  const { error } = await searchParams;

  return (
    <section className="mx-auto max-w-2xl px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{t("title")}</h1>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          <p className="text-sm text-smoke-400">{t("signedInAs")}</p>
          <p className="truncate font-medium">{user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn-secondary">
            {tNav("signOut")}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-ember-400/25 px-6 py-5">
        <h2 className="font-medium text-ember-400">{t("dangerTitle")}</h2>
        <p className="mt-1 text-sm text-smoke-400">{t("dangerBody")}</p>
        {error === "generic" && (
          <div className="mt-4">
            <FormMessage error="generic" />
          </div>
        )}
        <form action={deleteAccount} className="mt-4">
          <ConfirmSubmit
            message={t("confirmDelete")}
            className="btn btn-sm border-ember-400/40 text-ember-400 hover:bg-ember-900/60"
          >
            {t("deleteButton")}
          </ConfirmSubmit>
        </form>
      </div>
    </section>
  );
}
