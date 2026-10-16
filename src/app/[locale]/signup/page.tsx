import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForms";
import { Divider } from "@/components/auth/FormBits";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("signUp") };
}

export default async function SignUpPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await getCurrentUser()) return redirect({ href: "/collection", locale });

  const t = await getTranslations("Auth");

  return (
    <AuthShell
      title={t("signUpTitle")}
      subtitle={t("signUpSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-moss-300 hover:underline">
            {t("submitSignIn")}
          </Link>
        </>
      }
    >
      <GoogleButton />
      <Divider label={t("or")} />
      <SignUpForm />
    </AuthShell>
  );
}
