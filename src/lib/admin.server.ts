import { notFound } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { FeedbackCategory } from "./feedback";
import type { Concentration, Shelf } from "./perfumes";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient, getCurrentUser } from "./supabase/server";

// Every admin_* SQL function re-checks is_admin(); these helpers only decide
// what to render.

export const isAdmin = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  if (!(await getCurrentUser())) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
});

/** Sends guests to sign in and shows a 404 to signed-in non-admins. */
export async function requireAdmin(locale: string, path: string) {
  if (!(await getCurrentUser())) {
    return redirect({ href: { pathname: "/login", query: { next: path } }, locale });
  }
  if (!(await isAdmin())) notFound();
}

export type AdminOverview = {
  totalUsers: number;
  newUsers7d: number;
  catalogPerfumes: number;
  collectionEntries: number;
  wishlistEntries: number;
  ratingsGiven: number;
  newFeedback: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  providers: string[];
  collectionCount: number;
  wishlistCount: number;
  isAdmin: boolean;
};

export type AdminShelfEntry = {
  id: string;
  shelf: Shelf;
  rating: number | null;
  addedAt: string;
  perfume: {
    id: string;
    brand: string;
    name: string;
    concentration: Concentration | null;
    releaseYear: number | null;
    parfumoUrl: string | null;
  };
};

export type AdminPerfume = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  releaseYear: number | null;
  parfumoUrl: string | null;
  createdAt: string;
  createdByEmail: string | null;
  collectors: number;
  wishers: number;
  avgRating: number | null;
  ratingCount: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview").single();
  if (error) throw error;

  const row = data as Record<string, number>;
  return {
    totalUsers: row.total_users,
    newUsers7d: row.new_users_7d,
    catalogPerfumes: row.catalog_perfumes,
    collectionEntries: row.collection_entries,
    wishlistEntries: row.wishlist_entries,
    ratingsGiven: row.ratings_given,
    newFeedback: row.new_feedback,
  };
}

type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  providers: string[] | null;
  collection_count: number;
  wishlist_count: number;
  is_admin: boolean;
};

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    emailConfirmed: row.email_confirmed,
    providers: row.providers ?? [],
    collectionCount: row.collection_count,
    wishlistCount: row.wishlist_count,
    isAdmin: row.is_admin,
  };
}

export async function getAdminUsers(search?: string): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users", {
    p_search: search?.trim() || null,
  });
  if (error) throw error;
  return ((data ?? []) as AdminUserRow[]).map(toAdminUser);
}

export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users", { p_user_id: userId });
  // An id that isn't a uuid makes Postgres reject the call: treat as not found
  if (error) return null;
  const rows = (data ?? []) as AdminUserRow[];
  return rows[0] ? toAdminUser(rows[0]) : null;
}

export async function getAdminUserShelves(userId: string): Promise<AdminShelfEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_shelves", { p_user_id: userId });
  if (error) throw error;

  return (
    (data ?? []) as {
      entry_id: string;
      shelf: Shelf;
      rating: number | null;
      added_at: string;
      perfume_id: string;
      brand: string;
      name: string;
      concentration: Concentration | null;
      release_year: number | null;
      parfumo_url: string | null;
    }[]
  ).map((row) => ({
    id: row.entry_id,
    shelf: row.shelf,
    rating: row.rating,
    addedAt: row.added_at,
    perfume: {
      id: row.perfume_id,
      brand: row.brand,
      name: row.name,
      concentration: row.concentration,
      releaseYear: row.release_year,
      parfumoUrl: row.parfumo_url,
    },
  }));
}

export async function getAdminPerfumes(): Promise<AdminPerfume[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_perfumes");
  if (error) throw error;

  return (
    (data ?? []) as {
      id: string;
      brand: string;
      name: string;
      concentration: Concentration | null;
      release_year: number | null;
      parfumo_url: string | null;
      created_at: string;
      created_by_email: string | null;
      collectors: number;
      wishers: number;
      avg_rating: number | string | null;
      rating_count: number;
    }[]
  ).map((row) => ({
    id: row.id,
    brand: row.brand,
    name: row.name,
    concentration: row.concentration,
    releaseYear: row.release_year,
    parfumoUrl: row.parfumo_url,
    createdAt: row.created_at,
    createdByEmail: row.created_by_email,
    collectors: row.collectors,
    wishers: row.wishers,
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
    ratingCount: row.rating_count,
  }));
}

export type AdminAction = {
  id: number;
  adminEmail: string | null;
  action: "impersonate" | "delete_user";
  targetUserId: string | null;
  targetEmail: string | null;
  createdAt: string;
};

export async function getRecentAdminActions(): Promise<AdminAction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_recent_actions");
  if (error) throw error;

  return (
    (data ?? []) as {
      id: number;
      admin_email: string | null;
      action: AdminAction["action"];
      target_user_id: string | null;
      target_email: string | null;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.id,
    adminEmail: row.admin_email,
    action: row.action,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    createdAt: row.created_at,
  }));
}

export type AdminFeedback = {
  id: number;
  category: FeedbackCategory;
  message: string;
  status: "new" | "done";
  userId: string | null;
  userEmail: string | null;
  contactEmail: string | null;
  page: string | null;
  locale: string | null;
  userAgent: string | null;
  createdAt: string;
};

export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_feedback");
  if (error) throw error;

  return (
    (data ?? []) as {
      id: number;
      category: FeedbackCategory;
      message: string;
      status: AdminFeedback["status"];
      user_id: string | null;
      user_email: string | null;
      contact_email: string | null;
      page: string | null;
      locale: string | null;
      user_agent: string | null;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.id,
    category: row.category,
    message: row.message,
    status: row.status,
    userId: row.user_id,
    userEmail: row.user_email,
    contactEmail: row.contact_email,
    page: row.page,
    locale: row.locale,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
