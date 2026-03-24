import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { applyMemoryEvent } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";
import { completeSessionPayloadSchema } from "@/lib/schemas/memory";

export async function POST(request: NextRequest) {
  const auth = await requireSupabaseAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.accessToken);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsedPayload = completeSessionPayloadSchema.safeParse(payload);
  const sessionId =
    parsedPayload.success && parsedPayload.data.sessionId
      ? parsedPayload.data.sessionId
      : "";
  const timezone = parsedPayload.success ? parsedPayload.data.timezone ?? null : null;
  if (!sessionId || sessionId.length === 0) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient({ accessToken: auth.accessToken });
    const { data: items, error: itemsError } = await supabase
      .from("word_memory_session_items")
      .select("word_id, opened_card")
      .eq("session_id", sessionId);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const { error: sessionUpdateError } = await supabase
      .from("word_memory_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      throw new Error(`Failed to update session: ${sessionUpdateError.message}`);
    }

    const { error: itemsUpdateError } = await supabase
      .from("word_memory_session_items")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("session_id", sessionId);

    if (itemsUpdateError) {
      throw new Error(`Failed to update session items: ${itemsUpdateError.message}`);
    }

    const toReward = (items ?? []).filter((item) => !item.opened_card);
    await Promise.all(
      toReward.map((item) =>
        applyMemoryEvent(
          {
            wordId: item.word_id as string,
            sessionId,
            eventType: "mark_known",
            payload: { source: "session_complete" },
            timezone,
          },
          { accessToken: auth.accessToken },
        ),
      ),
    );

    return NextResponse.json({
      sessionId,
      rewarded: toReward.length,
      total: items?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
