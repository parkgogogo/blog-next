import { createClient } from "@supabase/supabase-js";

const getEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error("Supabase env vars are missing");
  }

  return { url, key };
};

const tryGetAccessTokenFromCookies = () => {
  return null;
};

export const getSupabaseClient = (options?: { accessToken?: string | null }) => {
  const { url, key } = getEnv();
  const accessToken =
    options?.accessToken !== undefined
      ? options.accessToken
      : tryGetAccessTokenFromCookies();

  return createClient(url, key, {
    auth: { persistSession: false },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
};

export const createSupabaseAdminClient = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error("Supabase admin env vars are missing");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
};
