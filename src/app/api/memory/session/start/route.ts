import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { applyMemoryEvent, getMemoryFeed } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";
import { startSessionPayloadSchema } from "@/lib/schemas/memory";

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

  const parsedPayload = startSessionPayloadSchema.safeParse(payload);
  const data = parsedPayload.success ? parsedPayload.data : {};
  const limit = data.limit;
  const groupSize = data.groupSize;
  const target = groupSize ?? limit;
  const timezone = data.timezone ?? null;

  try {
    const feedItems = await getMemoryFeed(target, {
      accessToken: auth.accessToken,
    });
    if (feedItems.length === 0) {
      return NextResponse.json({ error: "no_data" }, { status: 404 });
    }

    const supabase = getSupabaseClient({ accessToken: auth.accessToken });
    const { data: session, error: sessionError } = await supabase
      .from("word_memory_sessions")
      .insert({
        status: "active",
        group_size: feedItems.length,
        params: data.params ?? null,
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
        applyMemoryEvent(
          {
            wordId: item.word_id,
            sessionId,
            eventType: "exposure",
            payload: { source: "session_start" },
            timezone,
          },
          { accessToken: auth.accessToken },
        ),
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
