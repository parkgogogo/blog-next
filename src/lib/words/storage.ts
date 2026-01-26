import { addDays, format } from "date-fns";
import { getSupabaseClient } from "@/lib/supabase";

const WORDS_TABLE = "words";
const ENTRIES_TABLE = "word_entries";

export interface WordEntryRecord {
  id: string;
  wordText: string;
  language: string;
  sourceText: string | null;
  contextLine: string | null;
  context: string;
  createdAt: string;
}

export const ensureWordId = async (word: string, language = "en") => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(WORDS_TABLE)
    .upsert(
      {
        text: word,
        language,
      },
      { onConflict: "language,text" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
};

export const insertWordEntry = async (payload: {
  word: string;
  language?: string;
  context: string;
  brief: string;
  detail: string;
  sourceText?: string | null;
  contextLine?: string | null;
  maxChars?: number | null;
  provider?: string;
  providerPayload?: Record<string, unknown> | null;
  createdAt?: string;
}) => {
  const wordId = await ensureWordId(payload.word, payload.language ?? "en");
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(ENTRIES_TABLE)
    .insert({
      word_id: wordId,
      context: payload.context,
      brief: payload.brief,
      detail: payload.detail,
      source_text: payload.sourceText ?? null,
      context_line: payload.contextLine ?? null,
      max_chars: payload.maxChars ?? null,
      provider: payload.provider ?? "manual",
      provider_payload: payload.providerPayload ?? null,
      ...(payload.createdAt ? { created_at: payload.createdAt } : {}),
    })
    .select("id, word_id, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id as string,
    wordId: (data.word_id as string) || wordId,
    createdAt: data.created_at as string,
  };
};

export const listWordEntriesByDate = async (
  dateSlug: string,
): Promise<WordEntryRecord[]> => {
  const start = new Date(`${dateSlug}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid date slug");
  }
  const end = addDays(start, 1);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(ENTRIES_TABLE)
    .select(
      "id, created_at, source_text, context_line, context, words ( text, language )",
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((entry) => {
    const wordRow = entry.words as { text?: string; language?: string } | null;
    return {
      id: entry.id as string,
      wordText: wordRow?.text ?? "",
      language: wordRow?.language ?? "en",
      sourceText: (entry.source_text as string | null) ?? null,
      contextLine: (entry.context_line as string | null) ?? null,
      context: (entry.context as string) ?? "",
      createdAt: entry.created_at as string,
    };
  });
};

export const listWordEntryDates = async (): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(ENTRIES_TABLE)
    .select("created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const dates = new Set<string>();
  for (const row of data ?? []) {
    const createdAt = row.created_at as string | null;
    if (!createdAt) continue;
    dates.add(format(new Date(createdAt), "yyyy-MM-dd"));
  }

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
};

export const listWordTexts = async (): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(WORDS_TABLE).select("text");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.text as string)
    .filter(Boolean);
};

export const getWordEntryStatus = async (
  word: string,
  contextLine: string,
): Promise<"new" | "existing_same" | "existing_diff"> => {
  const supabase = getSupabaseClient();
  const { data: wordRow, error: wordError } = await supabase
    .from(WORDS_TABLE)
    .select("id")
    .eq("text", word)
    .maybeSingle();

  if (wordError) {
    throw new Error(wordError.message);
  }

  if (!wordRow?.id) {
    return "new";
  }

  const { data: entries, error: entriesError } = await supabase
    .from(ENTRIES_TABLE)
    .select("context_line")
    .eq("word_id", wordRow.id);

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const normalized = contextLine.trim();
  const hasSame =
    entries?.some((entry) => {
      const contextLine = (entry.context_line as string | null)?.trim();
      return contextLine === normalized;
    }) ?? false;

  return hasSame ? "existing_same" : "existing_diff";
};
