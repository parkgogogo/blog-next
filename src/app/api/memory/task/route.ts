import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim() || "";
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: task, error: taskError } = await supabase
      .from("word_memory_daily_tasks")
      .select("*")
      .eq("task_date", date)
      .maybeSingle();

    if (taskError) {
      throw new Error(taskError.message);
    }

    if (!task) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: cards, error: cardsError } = await supabase
      .from("word_memory_cards")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    if (cardsError) {
      throw new Error(cardsError.message);
    }

    const wordIds = new Set<string>();
    for (const card of cards ?? []) {
      wordIds.add(card.primary_word_id as string);
      for (const extra of (card.extra_word_ids as string[]) ?? []) {
        wordIds.add(extra);
      }
    }

    const { data: words, error: wordsError } = await supabase
      .from("words")
      .select("id, text")
      .in("id", Array.from(wordIds));

    if (wordsError) {
      throw new Error(wordsError.message);
    }

    const wordMap = new Map(
      (words ?? []).map((row) => [row.id as string, row.text as string]),
    );

    return NextResponse.json({
      task,
      cards:
        (cards ?? []).map((card) => {
          const ids = [
            card.primary_word_id as string,
            ...((card.extra_word_ids as string[]) ?? []),
          ];
          return {
            id: card.id,
            sentence: card.sentence,
            word_ids: ids,
            words: ids.map((id) => wordMap.get(id) || ""),
            word_count: card.word_count,
            char_count: card.char_count,
          };
        }) ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
