import { addDays, format } from "date-fns";
import { generateMemoryCards } from "@/lib/memory/ai-service";
import { getMemoryFeed, getMemorySettings } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";
import { dailyTaskOptionsSchema } from "@/lib/schemas/memory";

type MemoryFeedItemLite = {
  word_id: string;
  word_text: string;
  memory_score: number | string;
  exposure_count: number | string;
  success_count: number | string;
  fail_count: number | string;
};

type RawContextRecord = {
  context_line: string;
  source_text: string;
  context: string;
  created_at: string;
};

const isValidDateSlug = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const resolveTaskDate = (input?: string) => {
  if (input && isValidDateSlug(input)) return input;
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
};

const resolveTodayDate = (input?: string) => {
  if (input && isValidDateSlug(input)) return input;
  return format(new Date(), "yyyy-MM-dd");
};

export type DailyTaskResult = {
  task: {
    id: string;
    task_date: string;
    status: string;
    target_words: number;
    card_count: number;
    created_at: string;
    completed_at: string | null;
  };
  cards: Array<{
    id: string;
    sentence: string;
    word_ids: string[];
    words: string[];
    word_count: number;
    char_count: number;
  }>;
};

export const generateDailyTask = async (
  options?: {
    date?: string;
    force?: boolean;
    targetWords?: number;
    maxExtraWords?: number;
    maxChars?: number;
    maxSentences?: number;
  },
  authOptions?: { accessToken?: string | null },
) => {
  const parsedOptions = dailyTaskOptionsSchema.safeParse(options ?? {});
  const resolvedOptions = parsedOptions.success ? parsedOptions.data : {};
  const taskDate = resolveTaskDate(resolvedOptions.date);
  const settings = await getMemorySettings(authOptions);
  const force = resolvedOptions.force;
  const targetWords = resolvedOptions.targetWords ?? settings.daily_target;
  const maxExtraWords = Math.min(3, resolvedOptions.maxExtraWords ?? 3);
  const maxChars = resolvedOptions.maxChars ?? 160;
  const maxSentences = resolvedOptions.maxSentences ?? 2;

  const supabase = getSupabaseClient({ accessToken: authOptions?.accessToken });
  const { data: existingTask, error: taskError } = await supabase
    .from("word_memory_daily_tasks")
    .select("*")
    .eq("task_date", taskDate)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (existingTask && !force) {
    const { data: cards, error: cardsError } = await supabase
      .from("word_memory_cards")
      .select("*")
      .eq("task_id", existingTask.id)
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
      task: existingTask,
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
  }

  let taskId = existingTask?.id as string | undefined;
  if (existingTask && force) {
    await supabase
      .from("word_memory_cards")
      .delete()
      .eq("task_id", existingTask.id);
    await supabase
      .from("word_memory_daily_tasks")
      .update({ status: "running", card_count: 0, completed_at: null })
      .eq("id", existingTask.id);
  }

  if (!taskId) {
    const { data: created, error: createError } = await supabase
      .from("word_memory_daily_tasks")
      .insert({
        task_date: taskDate,
        status: "running",
        target_words: targetWords,
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    taskId = created.id as string;
  }

  const feedItems = (await getMemoryFeed(targetWords, authOptions)) as MemoryFeedItemLite[];
  if (feedItems.length === 0) {
    throw new Error("no_memory_words");
  }

  const wordIds = feedItems.map((item) => item.word_id);
  const { data: entries, error: entriesError } = await supabase
    .from("word_entries")
    .select("word_id, context_line, source_text, context, created_at")
    .in("word_id", wordIds)
    .order("created_at", { ascending: false });

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const contextsByWordId = new Map<string, RawContextRecord[]>();
  for (const entry of entries ?? []) {
    const wordId = entry.word_id as string;
    const list = contextsByWordId.get(wordId) ?? [];
    list.push({
      context_line: (entry.context_line as string | null) ?? "",
      source_text: (entry.source_text as string | null) ?? "",
      context: (entry.context as string | null) ?? "",
      created_at: (entry.created_at as string | null) ?? "",
    });
    contextsByWordId.set(wordId, list);
  }

  const contextMap: Record<string, RawContextRecord[]> = {};
  for (const item of feedItems) {
    contextMap[item.word_text] = contextsByWordId.get(item.word_id) ?? [];
  }

  const plannedCards = await generateMemoryCards({
    words: feedItems.map((item) => item.word_text).filter(Boolean),
    maxChars,
    maxSentences,
    maxWordsPerCard: Math.min(3, maxExtraWords + 1),
    taskDate,
    contexts: contextMap,
    force,
  });
  const itemByWord = new Map(
    feedItems.map((item) => [item.word_text.toLowerCase(), item]),
  );
  const cards: DailyTaskResult["cards"] = [];

  for (const planned of plannedCards) {
    const resolved = planned.words
      .map((word) => itemByWord.get(word.toLowerCase()))
      .filter(Boolean) as MemoryFeedItemLite[];
    if (resolved.length === 0) continue;

    const primary = resolved[0];
    const extras = resolved.slice(1, 3);
    const words = [primary.word_text, ...extras.map((extra) => extra.word_text)];
    const sentence = planned.sentence;
    const charCount = sentence.length;
    const wordIds = [primary.word_id, ...extras.map((extra) => extra.word_id)];

    const { data: cardRow, error: cardError } = await supabase
      .from("word_memory_cards")
      .insert({
        task_id: taskId,
        primary_word_id: primary.word_id,
        extra_word_ids: extras.map((extra) => extra.word_id),
        sentence,
        word_count: words.length,
        char_count: charCount,
      })
      .select("*")
      .single();

    if (cardError) {
      throw new Error(cardError.message);
    }

    cards.push({
      id: cardRow.id as string,
      sentence,
      word_ids: wordIds,
      words,
      word_count: words.length,
      char_count: charCount,
    });
  }

  if (cards.length === 0) {
    throw new Error("no_memory_cards");
  }

  const { data: finalTask, error: finalError } = await supabase
    .from("word_memory_daily_tasks")
    .update({
      status: "running",
      card_count: cards.length,
      completed_at: null,
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (finalError) {
    throw new Error(finalError.message);
  }

  return {
    task: finalTask,
    cards,
  } satisfies DailyTaskResult;
};

export const completeDailyTask = async (
  taskDate?: string,
  authOptions?: { accessToken?: string | null },
) => {
  const date = resolveTodayDate(taskDate);
  const supabase = getSupabaseClient({ accessToken: authOptions?.accessToken });
  const { data: task, error: taskError } = await supabase
    .from("word_memory_daily_tasks")
    .select("*")
    .eq("task_date", date)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task) {
    throw new Error("task_not_found");
  }

  const { data: updated, error: updateError } = await supabase
    .from("word_memory_daily_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated;
};
