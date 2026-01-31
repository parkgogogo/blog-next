import { format } from "date-fns";
import { DailyTaskClient } from "@/app/words/daily/daily-task-client";
import { generateDailyTask, type DailyTaskResult } from "@/lib/memory/task";
import { getSupabaseClient } from "@/lib/supabase";

type WordContext = {
  id: string;
  text: string;
  contextLine: string;
};

const loadDailyTask = async (date: string): Promise<DailyTaskResult> => {
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
    return generateDailyTask({ date });
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

  return {
    task,
    cards:
      (cards ?? []).map((card) => {
        const ids = [
          card.primary_word_id as string,
          ...((card.extra_word_ids as string[]) ?? []),
        ];
        return {
          id: card.id as string,
          sentence: card.sentence as string,
          word_ids: ids,
          words: ids.map((id) => wordMap.get(id) || ""),
          word_count: card.word_count as number,
          char_count: card.char_count as number,
        };
      }) ?? [],
  } satisfies DailyTaskResult;
};

const loadWordContexts = async (
  wordIds: string[],
  fallbackMap: Map<string, string>,
): Promise<Record<string, WordContext>> => {
  if (wordIds.length === 0) return {};
  const supabase = getSupabaseClient();
  const { data: entries, error } = await supabase
    .from("word_entries")
    .select("word_id, context_line, context, source_text, words ( text )")
    .in("word_id", wordIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const result = new Map<string, WordContext>();
  for (const entry of entries ?? []) {
    const wordId = entry.word_id as string;
    if (result.has(wordId)) continue;
    const wordRow = entry.words as { text?: string } | null;
    const text = wordRow?.text || fallbackMap.get(wordId) || "";
    const contextLine =
      (entry.context_line as string | null) ||
      (entry.source_text as string | null) ||
      (entry.context as string | null) ||
      "";
    result.set(wordId, {
      id: wordId,
      text,
      contextLine: contextLine.trim(),
    });
  }

  for (const wordId of wordIds) {
    if (!result.has(wordId)) {
      result.set(wordId, {
        id: wordId,
        text: fallbackMap.get(wordId) || "",
        contextLine: "",
      });
    }
  }

  return Object.fromEntries(result.entries());
};

export default async function DailyWordsPage() {
  const date = format(new Date(), "yyyy-MM-dd");
  const result = await loadDailyTask(date);
  const wordIds = new Set<string>();
  const fallbackMap = new Map<string, string>();
  for (const card of result.cards) {
    card.word_ids.forEach((wordId, index) => {
      wordIds.add(wordId);
      fallbackMap.set(wordId, card.words[index] || "");
    });
  }

  const wordContexts = await loadWordContexts(
    Array.from(wordIds),
    fallbackMap,
  );

  return (
    <DailyTaskClient
      date={date}
      cards={result.cards}
      wordContexts={wordContexts}
    />
  );
}
