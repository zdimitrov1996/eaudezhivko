"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Called by the notifications page once it has shown them; clears the bell's count. */
export async function markNotificationsRead() {
  if (!isSupabaseConfigured || !(await getCurrentUser())) return;

  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read");
  revalidatePath("/[locale]", "layout");
}
