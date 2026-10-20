import type { Metadata } from "next";
import { ShelfPage, shelfMetadata } from "@/components/perfumes/ShelfPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/finished">): Promise<Metadata> {
  return shelfMetadata("finished", (await params).locale);
}

export default async function FinishedPage({ params }: PageProps<"/[locale]/finished">) {
  return <ShelfPage shelf="finished" locale={(await params).locale} />;
}
