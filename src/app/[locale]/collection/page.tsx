import type { Metadata } from "next";
import { ShelfPage, shelfMetadata } from "@/components/perfumes/ShelfPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/collection">): Promise<Metadata> {
  return shelfMetadata("collection", (await params).locale);
}

export default async function CollectionPage({ params }: PageProps<"/[locale]/collection">) {
  return <ShelfPage shelf="collection" locale={(await params).locale} />;
}
