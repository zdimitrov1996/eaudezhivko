import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell, AdminTable, Td, Th } from "@/components/admin/AdminShell";
import { ExternalIcon } from "@/components/icons";
import { getAdminPerfumes, requireAdmin } from "@/lib/admin.server";
import { perfumeLink, type LinkSite } from "@/lib/perfumes";

const SITES: { site: LinkSite; label: string }[] = [
  { site: "fragrantica", label: "Fragrantica" },
  { site: "parfumo", label: "Parfumo" },
];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/perfumes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("catalogueTitle")} · ${t("title")}`, robots: { index: false, follow: false } };
}

export default async function AdminPerfumesPage({ params }: PageProps<"/[locale]/admin/perfumes">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale, "/admin/perfumes");

  const [t, tc, format, perfumes] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Concentration"),
    getFormatter(),
    getAdminPerfumes(),
  ]);

  return (
    <AdminShell>
      <h2 className="font-serif text-3xl font-semibold">{t("catalogueTitle")}</h2>
      <p className="mt-1 mb-5 text-sm text-smoke-400">{t("catalogueCount", { count: perfumes.length })}</p>

      <AdminTable>
        <thead>
          <tr>
            <Th>{t("colPerfume")}</Th>
            <Th>{t("colConcentration")}</Th>
            <Th align="right">{t("colCollectors")}</Th>
            <Th align="right">{t("colWishers")}</Th>
            <Th align="right">{t("colRating")}</Th>
            <Th>{t("colAddedBy")}</Th>
            <Th>{t("colLinks")}</Th>
          </tr>
        </thead>
        <tbody>
          {perfumes.length === 0 && (
            <tr>
              <Td colSpan={7} className="text-smoke-400">
                {t("emptyCatalogue")}
              </Td>
            </tr>
          )}
          {perfumes.map((perfume) => (
            <tr key={perfume.id} className="hover:bg-veil-soft">
              <Td>
                <span className="text-smoke-400">{perfume.brand}</span>{" "}
                <span className="font-medium text-smoke-100">{perfume.name}</span>
              </Td>
              <Td className="whitespace-nowrap text-smoke-300">
                {[perfume.concentration && tc(perfume.concentration), perfume.releaseYear]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Td>
              <Td align="right">{perfume.collectors}</Td>
              <Td align="right">{perfume.wishers}</Td>
              <Td align="right" className="whitespace-nowrap">
                {perfume.avgRating !== null ? (
                  <>
                    {perfume.avgRating.toFixed(1)}
                    <span className="text-smoke-500"> ({perfume.ratingCount})</span>
                  </>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="text-smoke-300">
                <span className="block">{perfume.createdByEmail ?? t("unknownUser")}</span>
                <span className="block text-xs text-smoke-500">
                  {format.dateTime(new Date(perfume.createdAt), { dateStyle: "medium" })}
                </span>
              </Td>
              <Td>
                <div className="flex gap-3">
                  {SITES.map(({ site, label }) => {
                    const link = perfumeLink(perfume, site);
                    return (
                      <a
                        key={site}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-moss-300 ${
                          link.isSearch ? "text-smoke-500" : "text-smoke-200"
                        }`}
                      >
                        {label}
                        <ExternalIcon />
                      </a>
                    );
                  })}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </AdminShell>
  );
}
