import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireSupabaseAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.accessToken);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const supabase = getSupabaseClient({ accessToken: auth.accessToken });
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
