import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { redirect } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("resetTitle") };
}

// Reached from the password-reset email, which signs the user in first
export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isSupabaseConfigured && !(await getCurrentUser())) {
    return redirect({ href: { pathname: "/login", query: { error: "linkInvalid" } }, locale });
  }

  const t = await getTranslations("Auth");

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
