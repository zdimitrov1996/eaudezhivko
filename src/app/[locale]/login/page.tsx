import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/AuthForms";
import { Divider } from "@/components/auth/FormBits";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Link, redirect } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/site-url";
import { getCurrentUser } from "@/lib/supabase/server";

// Errors that other pages and auth callbacks may send here via ?error=
const LINKABLE_ERRORS = new Set(["linkInvalid", "oauth", "notConfigured", "generic"]);

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("signIn") };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const next = safeNextPath(query.next, "/collection");

  if (await getCurrentUser()) return redirect({ href: next, locale });

  const t = await getTranslations("Auth");
  const error = typeof query.error === "string" && LINKABLE_ERRORS.has(query.error) ? query.error : undefined;

  return (
    <AuthShell
      title={t("signInTitle")}
      subtitle={t("signInSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-moss-300 hover:underline">
            {t("submitSignUp")}
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />
      <Divider label={t("or")} />
      <SignInForm next={next} initialError={error} />
    </AuthShell>
  );
}
