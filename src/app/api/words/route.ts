import { NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireApiKey(request as never);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request as never, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("words")
    .select("id, text")
    .order("text", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const words = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      word: row.text as string,
    }))
    .filter((entry) => entry.word);

  return NextResponse.json({ words });
}
