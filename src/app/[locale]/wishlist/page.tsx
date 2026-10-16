import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShelfView } from "@/components/perfumes/ShelfView";
import { redirect } from "@/i18n/navigation";
import { sampleShelf } from "@/lib/sample-shelf";
import { getShelf } from "@/lib/shelf.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wishlist">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shelf" });
  return { title: t("wishlistTitle") };
}

export default async function WishlistPage({ params }: PageProps<"/[locale]/wishlist">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured) {
    return <ShelfView shelf="wishlist" entries={sampleShelf("wishlist")} demo />;
  }

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: { pathname: "/login", query: { next: "/wishlist" } }, locale });
  }

  return <ShelfView shelf="wishlist" entries={await getShelf("wishlist")} />;
}
