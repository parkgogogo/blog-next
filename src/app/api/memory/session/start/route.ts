import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { applyMemoryEvent, getMemoryFeed } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";

type StartSessionPayload = {
  limit?: number;
  groupSize?: number;
  params?: Record<string, unknown>;
};

const parseNumber = (value: unknown) => {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.floor(value);
};

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: StartSessionPayload = {};
  try {
    payload = (await request.json()) as StartSessionPayload;
  } catch {
    payload = {};
  }

  const limit = parseNumber(payload.limit);
  const groupSize = parseNumber(payload.groupSize);
  const target = groupSize ?? limit;

  try {
    const feedItems = await getMemoryFeed(target);
    if (feedItems.length === 0) {
      return NextResponse.json({ error: "no_data" }, { status: 404 });
    }

    const supabase = getSupabaseClient();
    const { data: session, error: sessionError } = await supabase
      .from("word_memory_sessions")
      .insert({
        status: "active",
        group_size: feedItems.length,
        params: payload.params ?? null,
      })
      .select("id, status, group_size, started_at")
      .single();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const sessionId = session?.id as string;
    const itemsToInsert = feedItems.map((item, index) => ({
      session_id: sessionId,
      word_id: item.word_id,
      rank: index + 1,
      priority: item.priority,
    }));

    const { error: itemsError } = await supabase
      .from("word_memory_session_items")
      .insert(itemsToInsert);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    await Promise.all(
      feedItems.map((item) =>
        applyMemoryEvent({
          wordId: item.word_id,
          sessionId,
          eventType: "exposure",
          payload: { source: "session_start" },
        }),
      ),
    );

    return NextResponse.json({
      session,
      items: feedItems.map((item, index) => ({
        ...item,
        rank: index + 1,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
