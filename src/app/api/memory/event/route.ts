import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { applyMemoryEvent } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";
import { memoryEventRequestSchema } from "@/lib/schemas/memory";

export async function POST(request: NextRequest) {
  const auth = await requireSupabaseAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.accessToken);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsedPayload = memoryEventRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "wordId and valid eventType required" }, { status: 400 });
  }

  const wordId = parsedPayload.data.wordId;
  const sessionId = parsedPayload.data.sessionId ?? null;
  const eventType = parsedPayload.data.eventType;
  const timezone = parsedPayload.data.timezone ?? null;

  try {
    const updated = await applyMemoryEvent(
      {
        wordId,
        sessionId,
        eventType,
        deltaScore: parsedPayload.data.deltaScore,
        payload: parsedPayload.data.payload,
        timezone,
      },
      { accessToken: auth.accessToken },
    );

    if (eventType === "open_card" && sessionId) {
      const supabase = getSupabaseClient({ accessToken: auth.accessToken });
      const { error: itemError } = await supabase
        .from("word_memory_session_items")
        .update({ opened_card: true })
        .eq("session_id", sessionId)
        .eq("word_id", wordId);

      if (itemError) {
        throw new Error(itemError.message);
      }

      const { count, error: countError } = await supabase
        .from("word_memory_session_items")
        .select("id", { count: "exact" })
        .eq("session_id", sessionId)
        .eq("opened_card", true);

      if (!countError) {
        await supabase
          .from("word_memory_sessions")
          .update({ opened_card_count: count ?? 0 })
          .eq("id", sessionId);
      }
    }

    return NextResponse.json({ state: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
