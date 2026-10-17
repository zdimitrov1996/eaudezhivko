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
}: PageProps<"/[locale]/collection">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shelf" });
  return { title: t("collectionTitle") };
}

export default async function CollectionPage({ params }: PageProps<"/[locale]/collection">) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured) {
    return <ShelfView shelf="collection" entries={sampleShelf("collection")} demo />;
  }

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: { pathname: "/login", query: { next: "/collection" } }, locale });
  }

  return <ShelfView shelf="collection" entries={await getShelf("collection")} currentUserId={user.id} />;
}
