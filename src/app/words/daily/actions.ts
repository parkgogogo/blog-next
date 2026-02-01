"use server";

import { applyMemoryEvent } from "@/lib/memory";
import { completeDailyTask, type DailyTaskResult, generateDailyTask } from "@/lib/memory/task";
import { getWordCardBundle, translateSentence } from "@/lib/words/ai-service";
import { getSupabaseClient } from "@/lib/supabase";

type WordContext = {
  id: string;
  text: string;
  contextLines: string[];
};

type DailyMemoryEventType = "exposure" | "open_card" | "mark_known";

export const recordMemoryEventAction = async (payload: {
  wordId: string;
  eventType: DailyMemoryEventType;
  deltaScore?: number | null;
  meta?: Record<string, unknown> | null;
}) => {
  return applyMemoryEvent({
    wordId: payload.wordId,
    eventType: payload.eventType,
    deltaScore: payload.deltaScore ?? null,
    payload: payload.meta ?? null,
  });
};

export const completeDailyTaskAction = async (date: string) => {
  return completeDailyTask(date);
};

export const getDailyWordBundleAction = async (payload: {
  word: string;
  sourceText: string;
  force?: boolean;
  maxChars?: number;
}) => {
  return getWordCardBundle(payload.word, payload.sourceText, {
    force: payload.force,
    maxChars: payload.maxChars,
    contextMode: "none",
  });
};

export const translateContextLinesAction = async (payload: {
  lines: string[];
}) => {
  const lines = (payload.lines ?? []).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const translations = await Promise.all(
    lines.map((line) => translateSentence(line)),
  );
  return translations;
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
  const seenByWord = new Map<string, Set<string>>();
  for (const entry of entries ?? []) {
    const wordId = entry.word_id as string;
    const wordRow = entry.words as { text?: string } | null;
    const text = wordRow?.text || fallbackMap.get(wordId) || "";
    const contextLine =
      (entry.context_line as string | null) ||
      (entry.source_text as string | null) ||
      (entry.context as string | null) ||
      "";
    const normalized = contextLine.trim();
    if (!normalized) continue;
    if (!result.has(wordId)) {
      result.set(wordId, {
        id: wordId,
        text,
        contextLines: [],
      });
      seenByWord.set(wordId, new Set());
    } else if (!result.get(wordId)?.text && text) {
      result.get(wordId)!.text = text;
    }
    const seen = seenByWord.get(wordId) ?? new Set<string>();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      seenByWord.set(wordId, seen);
      result.get(wordId)?.contextLines.push(normalized);
    }
  }

  for (const wordId of wordIds) {
    if (!result.has(wordId)) {
      result.set(wordId, {
        id: wordId,
        text: fallbackMap.get(wordId) || "",
        contextLines: [],
      });
    }
  }

  return Object.fromEntries(result.entries());
};

export const loadDailyTaskAction = async (date: string) => {
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

  return {
    date,
    cards: result.cards,
    wordContexts,
  };
};
