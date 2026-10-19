"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * After a page loads, asks the server to re-read Parfumo for `ids` whose data
 * is missing or a week old, then refreshes the page if any changed. Renders nothing.
 */
export function RatingsRefresher({ ids, refresh }: { ids: string[]; refresh: (ids: string[]) => Promise<number> }) {
  const router = useRouter();
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    refresh(key.split(",")).then((updated) => {
      if (!cancelled && updated > 0) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [key, refresh, router]);

  return null;
}
