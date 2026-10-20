import { createClient } from "./supabase/server";

export type NotificationKind = "feedback_in_progress" | "feedback_done";

export type UserNotification = {
  id: number;
  kind: NotificationKind;
  /** The start of the user's feedback */
  feedbackExcerpt: string | null;
  /** What was done, from the admin */
  message: string | null;
  createdAt: string;
  read: boolean;
};

/** The signed-in user's notifications, newest first (RLS shows only their own). */
export async function getNotifications(): Promise<UserNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, feedback_excerpt, message, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    feedbackExcerpt: row.feedback_excerpt,
    message: row.message,
    createdAt: row.created_at,
    read: row.read_at !== null,
  }));
}

/** For the bell in the header; 0 when it can't be read. */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}
