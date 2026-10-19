import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Shelf } from "@/lib/perfumes";
import { sampleShelf } from "@/lib/sample-shelf";
import { getShelf } from "@/lib/shelf.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";
import { ShelfView } from "./ShelfView";

export async function shelfMetadata(shelf: Shelf, locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Shelf" });
  return { title: t(`${shelf}Title`) };
}

/** The collection and wishlist pages: sample perfumes without a database, else the user's own shelf. */
export async function ShelfPage({ shelf, locale }: { shelf: Shelf; locale: string }) {
  setRequestLocale(locale);
  if (!isSupabaseConfigured) return <ShelfView shelf={shelf} entries={sampleShelf(shelf)} demo />;

  const user = await getCurrentUser();
  if (!user) return redirect({ href: { pathname: "/login", query: { next: `/${shelf}` } }, locale });

  return <ShelfView shelf={shelf} entries={await getShelf(shelf)} currentUserId={user.id} />;
}
