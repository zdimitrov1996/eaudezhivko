"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function AdminNav() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  const tabs = [
    { href: "/admin", label: t("navUsers"), active: pathname === "/admin" || pathname.startsWith("/admin/users") },
    { href: "/admin/perfumes", label: t("navCatalogue"), active: pathname.startsWith("/admin/perfumes") },
    { href: "/admin/feedback", label: t("navFeedback"), active: pathname.startsWith("/admin/feedback") },
  ];

  return (
    <nav aria-label={t("title")} className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-ink-600 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
            tab.active ? "bg-moss-900 text-moss-300" : "text-smoke-300 hover:text-smoke-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
