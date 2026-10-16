// Public values: safe to ship to the browser. Row Level Security protects the data.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until the Supabase project's URL and publishable key are in .env.local */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
