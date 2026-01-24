import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error("Supabase env vars are missing");
  }

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabaseClient;
};
