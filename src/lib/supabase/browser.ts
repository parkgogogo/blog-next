import { createClient } from "@supabase/supabase-js";

export const getBrowserSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

  if (!url || !key) {
    throw new Error("Supabase browser env vars are missing");
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
};
