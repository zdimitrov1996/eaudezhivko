import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BottleMark } from "../Logo";

export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = await getTranslations("Config");

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-12 sm:pt-20">
      <div className="card px-6 py-8 sm:px-8">
        <BottleMark className="h-10 w-10" />
        <h1 className="mt-5 font-serif text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-smoke-400">{subtitle}</p>

        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-2xl border border-moss-800 bg-moss-900/40 px-4 py-3 text-sm">
            <p className="font-medium text-moss-200">{t("title")}</p>
            <p className="mt-1 text-moss-200/80">{t("body")}</p>
          </div>
        )}

        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-smoke-400">{footer}</div>}
    </section>
  );
}
