import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { applyMemoryEvent, type MemoryEventPayload } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";

type EventRequest = MemoryEventPayload;

const isEventType = (value: string): value is EventRequest["eventType"] =>
  ["exposure", "open_card", "mark_known", "mark_unknown"].includes(value);

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: EventRequest;
  try {
    payload = (await request.json()) as EventRequest;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const wordId = typeof payload.wordId === "string" ? payload.wordId.trim() : "";
  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId.trim() : null;
  const eventType =
    typeof payload.eventType === "string" ? payload.eventType.trim() : "";

  if (!wordId || !eventType || !isEventType(eventType)) {
    return NextResponse.json({ error: "wordId and valid eventType required" }, { status: 400 });
  }

  try {
    const updated = await applyMemoryEvent({
      wordId,
      sessionId,
      eventType,
      deltaScore: payload.deltaScore,
      payload: payload.payload,
    });

    if (eventType === "open_card" && sessionId) {
      const supabase = getSupabaseClient();
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
