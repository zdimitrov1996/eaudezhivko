"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserNotification } from "@/lib/notifications.server";

export type ListedNotification = UserNotification & { dateLabel: string };

/**
 * The notifications, with the ones unread on arrival marked as new. Once shown,
 * they're marked read and the page refreshes so the bell's count clears; the
 * "new" marks stay until the user leaves, since this state survives the refresh.
 */
export function NotificationList({
  items,
  markRead,
}: {
  items: ListedNotification[];
  markRead: () => Promise<void>;
}) {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [fresh] = useState(() => new Set(items.filter((item) => !item.read).map((item) => item.id)));

  useEffect(() => {
    if (fresh.size === 0) return;
    markRead().then(() => router.refresh());
  }, [fresh, markRead, router]);

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id} className={`card px-5 py-4 ${fresh.has(item.id) ? "border-moss-800" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-medium text-smoke-100">
              {fresh.has(item.id) && (
                <span className="h-2 w-2 rounded-full bg-moss-400">
                  <span className="sr-only">{t("unread")}</span>
                </span>
              )}
              {t(`kind.${item.kind}`)}
            </p>
            <span className="text-sm text-smoke-500">{item.dateLabel}</span>
          </div>
          {item.message && <p className="mt-3 whitespace-pre-wrap break-words text-smoke-200">{item.message}</p>}
          {item.feedbackExcerpt && (
            <blockquote className="mt-3 border-l-2 border-ink-600 pl-3 text-sm text-smoke-400">
              <span className="text-smoke-500">{t("yourFeedback")} </span>
              {item.feedbackExcerpt}
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
}
