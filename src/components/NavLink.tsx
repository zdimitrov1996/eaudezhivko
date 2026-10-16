"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-moss-900 text-moss-300"
          : "text-smoke-300 hover:bg-white/5 hover:text-smoke-100"
      }`}
    >
      {children}
    </Link>
  );
}
