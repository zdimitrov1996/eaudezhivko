import type { Metadata } from "next";
import { ShelfPage, shelfMetadata } from "@/components/perfumes/ShelfPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/wishlist">): Promise<Metadata> {
  return shelfMetadata("wishlist", (await params).locale);
}

export default async function WishlistPage({ params }: PageProps<"/[locale]/wishlist">) {
  return <ShelfPage shelf="wishlist" locale={(await params).locale} />;
}
