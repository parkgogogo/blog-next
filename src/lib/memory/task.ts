import { addDays, format } from "date-fns";
import { ensureMemorySentence, groupMemoryWords } from "@/lib/memory/ai-service";
import { getMemoryFeed, getMemorySettings } from "@/lib/memory";
import { getSupabaseClient } from "@/lib/supabase";

type MemoryFeedItemLite = {
  word_id: string;
  word_text: string;
  memory_score: number | string;
  exposure_count: number | string;
  success_count: number | string;
  fail_count: number | string;
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

const buildCardPlan = async (
  items: MemoryFeedItemLite[],
  taskDate: string,
  force: boolean | undefined,
) => {
  if (items.length === 0) return [];

  const words = items.map((item) => item.word_text).filter(Boolean);
  const groups = await groupMemoryWords({
    words,
    taskDate,
    force,
  });

  const lookup = new Map(
    items.map((item) => [item.word_text.toLowerCase(), item]),
  );

  return groups.map((group) => {
    const resolved = group
      .map((word) => lookup.get(word.toLowerCase()))
      .filter(Boolean) as MemoryFeedItemLite[];

    const primary = resolved[0] ?? items[0];
    const extras = resolved.slice(1, 4);
    return {
      primary,
      extras,
    };
  });
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

export const generateDailyTask = async (options?: {
  date?: string;
  force?: boolean;
  targetWords?: number;
  maxExtraWords?: number;
  maxChars?: number;
  maxSentences?: number;
}) => {
  const taskDate = resolveTaskDate(options?.date);
  const settings = await getMemorySettings();
  const targetWords =
    typeof options?.targetWords === "number" && options.targetWords > 0
      ? Math.floor(options.targetWords)
      : settings.daily_target;
  const maxExtraWords =
    typeof options?.maxExtraWords === "number" && options.maxExtraWords >= 0
      ? Math.min(3, Math.floor(options.maxExtraWords))
      : 3;
  const maxChars =
    typeof options?.maxChars === "number" && options.maxChars > 0
      ? Math.floor(options.maxChars)
      : 160;
  const maxSentences =
    typeof options?.maxSentences === "number" && options.maxSentences > 0
      ? Math.floor(options.maxSentences)
      : 2;

  const supabase = getSupabaseClient();
  const { data: existingTask, error: taskError } = await supabase
    .from("word_memory_daily_tasks")
    .select("*")
    .eq("task_date", taskDate)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (existingTask && !options?.force) {
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
  if (existingTask && options?.force) {
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

  const feedItems = (await getMemoryFeed(targetWords)) as MemoryFeedItemLite[];
  if (feedItems.length === 0) {
    throw new Error("no_memory_words");
  }

  const plan = await buildCardPlan(feedItems, taskDate, options?.force);
  const cards: DailyTaskResult["cards"] = [];

  for (const entry of plan) {
    const extras = entry.extras.slice(0, maxExtraWords);
    const words = [entry.primary.word_text, ...extras.map((extra) => extra.word_text)].filter(
      Boolean,
    );
    const sentence = await ensureMemorySentence({
      words,
      maxChars,
      maxSentences,
      taskDate,
      force: options?.force,
    });
    const charCount = sentence.length;
    const wordIds = [entry.primary.word_id, ...extras.map((extra) => extra.word_id)];

    const { data: cardRow, error: cardError } = await supabase
      .from("word_memory_cards")
      .insert({
        task_id: taskId,
        primary_word_id: entry.primary.word_id,
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

  const { data: finalTask, error: finalError } = await supabase
    .from("word_memory_daily_tasks")
    .update({
      status: "completed",
      card_count: cards.length,
      completed_at: new Date().toISOString(),
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

export const completeDailyTask = async (taskDate?: string) => {
  const date = resolveTodayDate(taskDate);
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
