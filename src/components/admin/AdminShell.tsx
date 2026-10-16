import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";

export async function AdminShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("Admin");

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Eau de Fragrances</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
        </div>
        <AdminNav />
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Table wrapper that scrolls sideways on phones instead of the page. */
export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`border-b border-ink-600 px-4 py-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-smoke-400 uppercase ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  colSpan,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-ink-700 px-4 py-3 align-middle ${
        align === "right" ? "text-right tabular-nums" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "moss" | "ember" }) {
  const tones = {
    neutral: "bg-ink-700 text-smoke-300",
    moss: "bg-moss-900 text-moss-300",
    ember: "bg-ember-900 text-ember-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({ children, tone = "moss" }: { children: ReactNode; tone?: "moss" | "ember" }) {
  return (
    <p
      role={tone === "ember" ? "alert" : "status"}
      className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
        tone === "ember"
          ? "border-ember-400/30 bg-ember-900/60 text-ember-400"
          : "border-moss-800 bg-moss-900/40 text-moss-200"
      }`}
    >
      {children}
    </p>
  );
}
