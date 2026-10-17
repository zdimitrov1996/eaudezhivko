"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshParfumoRatings } from "@/actions/perfumes";

/**
 * After a shelf loads, fetches Parfumo ratings that are missing or a week old
 * in the background, then refreshes the page if any changed. Renders nothing.
 */
export function RatingsRefresher({ perfumeIds }: { perfumeIds: string[] }) {
  const router = useRouter();
  const key = perfumeIds.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    refreshParfumoRatings(key.split(",")).then((updated) => {
      if (!cancelled && updated > 0) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [key, router]);

  return null;
}
