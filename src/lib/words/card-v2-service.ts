import { AI_TEXT_MODEL, ai_generateText } from "@/lib/ai";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
  type AIGenerationType,
} from "@/lib/ai-cache";
import { getSupabaseClient } from "@/lib/supabase";
import { WORD_CARD_V2_PROMPT } from "@/lib/words/constants";

export type WordCardMode = "brief" | "detail";
export type WordCardScenario = "plugin" | "daily";
export type HistoryContextStatus = "hit" | "empty" | "timeout" | "error";

export class DailyContextNotFoundError extends Error {
  constructor() {
    super("daily_context_not_found");
  }
}

export type PreparedWordCardV2 = {
  scenario: WordCardScenario;
  mode: WordCardMode;
  word: string;
  primaryContext: string;
  historyContexts: string[];
  historyContextStatus: HistoryContextStatus;
  maxChars: number;
  cacheType: AIGenerationType;
  cacheKey: string;
  inputHash: string;
  prompt: string;
};

export type WordCardV2Result = {
  type: "word_card_plugin_v2" | "word_card_daily_v2";
  scenario: WordCardScenario;
  mode: WordCardMode;
  word: string;
  primaryContext: string;
  historyContextStatus: HistoryContextStatus;
  historyContexts: string[];
  content: string;
  cached: boolean;
};

const MAX_HISTORY_LINES = 3;
const HISTORY_TIMEOUT_MS = 120;
const ENABLE_WORD_CARD_V2_DB_CACHE = false;

const clampMaxChars = (value?: number) => {
  return Math.max(80, Math.min(value ?? 160, 320));
};

const normalizeContextLine = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const toSafeWord = (word: string) => {
  return word
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
};

const dedupeContextLines = (entries: unknown[]) => {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const entry of entries) {
    const row = entry as {
      context_line?: unknown;
      source_text?: unknown;
      context?: unknown;
    };
    const line =
      normalizeContextLine(row.context_line) ||
      normalizeContextLine(row.source_text) ||
      normalizeContextLine(row.context);

    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
    if (lines.length >= MAX_HISTORY_LINES) break;
  }
  return lines;
};

const loadContextLinesByWordId = async (wordId: string, accessToken: string) => {
  const supabase = getSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("word_entries")
    .select("context_line, source_text, context")
    .eq("word_id", wordId)
    .order("created_at", { ascending: false })
    .limit(16);

  if (error) {
    throw new Error(error.message);
  }

  return dedupeContextLines(data ?? []);
};

const loadWordIdByText = async (word: string, accessToken: string) => {
  const supabase = getSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("words")
    .select("id")
    .eq("text", word)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.id as string | undefined) ?? null;
};

const loadPluginHistoryContexts = async (options: {
  word: string;
  accessToken: string;
  timeoutMs?: number;
}) => {
  const timeoutMs = Math.max(1, options.timeoutMs ?? HISTORY_TIMEOUT_MS);
  const timeoutToken = Symbol("timeout");

  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const result = await Promise.race([
      (async () => {
        const wordId = await loadWordIdByText(options.word, options.accessToken);
        if (!wordId) return [] as string[];
        return loadContextLinesByWordId(wordId, options.accessToken);
      })(),
      new Promise<typeof timeoutToken>((resolve) => {
        timer = setTimeout(() => resolve(timeoutToken), timeoutMs);
      }),
    ]);
    if (timer) {
      clearTimeout(timer);
    }

    if (result === timeoutToken) {
      return {
        status: "timeout" as const,
        historyContexts: [] as string[],
      };
    }

    return {
      status: result.length > 0 ? ("hit" as const) : ("empty" as const),
      historyContexts: result,
    };
  } catch {
    return {
      status: "error" as const,
      historyContexts: [] as string[],
    };
  }
};

const buildPrompt = (options: {
  scenario: WordCardScenario;
  mode: WordCardMode;
  word: string;
  primaryContext: string;
  historyContexts: string[];
  maxChars: number;
}) => {
  const historyBlock =
    options.historyContexts.length > 0
      ? options.historyContexts.map((line, index) => `${index + 1}) ${line}`).join("\n")
      : "(none)";

  return `scenario: ${options.scenario}\nmode: ${options.mode}\nword: ${options.word}\nprimary_context: ${options.primaryContext}\nmax_chars: ${options.maxChars}\nhistory_contexts:\n${historyBlock}`;
};

const buildPreparedInput = (options: {
  scenario: WordCardScenario;
  mode: WordCardMode;
  word: string;
  primaryContext: string;
  historyContexts: string[];
  historyContextStatus: HistoryContextStatus;
  maxChars: number;
}) => {
  const prompt = buildPrompt(options);
  const inputHash = createInputHash({
    version: 1,
    type: options.scenario === "plugin" ? "word_card_plugin_v2" : "word_card_daily_v2",
    mode: options.mode,
    system: WORD_CARD_V2_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });

  const safeWord = toSafeWord(options.word);
  const cacheType =
    options.scenario === "plugin"
      ? ("word_card_plugin_v2" as const)
      : ("word_card_daily_v2" as const);
  const cacheKeyPrefix =
    options.scenario === "plugin" ? "WORD_CARD_PLUGIN_V2" : "WORD_CARD_DAILY_V2";

  return {
    scenario: options.scenario,
    mode: options.mode,
    word: options.word,
    primaryContext: options.primaryContext,
    historyContexts: options.historyContexts,
    historyContextStatus: options.historyContextStatus,
    maxChars: options.maxChars,
    cacheType,
    cacheKey: `${cacheKeyPrefix}_${safeWord || "WORD"}_${inputHash.slice(0, 12)}_${options.mode.toUpperCase()}`,
    inputHash,
    prompt,
  } satisfies PreparedWordCardV2;
};

export const preparePluginWordCardV2 = async (options: {
  word: string;
  sourceSentence: string;
  mode: WordCardMode;
  maxChars?: number;
  accessToken: string;
}) => {
  const primaryContext = options.sourceSentence.trim();
  const historyResult = await loadPluginHistoryContexts({
    word: options.word,
    accessToken: options.accessToken,
  });

  const historyContexts = historyResult.historyContexts.filter(
    (line) => line !== primaryContext,
  );
  const historyContextStatus =
    historyResult.status === "hit" && historyContexts.length === 0
      ? ("empty" as const)
      : historyResult.status;

  return buildPreparedInput({
    scenario: "plugin",
    mode: options.mode,
    word: options.word,
    primaryContext,
    historyContexts,
    historyContextStatus,
    maxChars: clampMaxChars(options.maxChars),
  });
};

export const prepareDailyWordCardV2 = async (options: {
  wordId: string;
  mode: WordCardMode;
  maxChars?: number;
  accessToken: string;
}) => {
  const supabase = getSupabaseClient({ accessToken: options.accessToken });
  const { data: wordRow, error: wordError } = await supabase
    .from("words")
    .select("text")
    .eq("id", options.wordId)
    .maybeSingle();

  if (wordError) {
    throw new Error(wordError.message);
  }

  const wordText = (wordRow?.text as string | undefined)?.trim();
  if (!wordText) {
    throw new DailyContextNotFoundError();
  }

  const contextLines = await loadContextLinesByWordId(options.wordId, options.accessToken);
  if (contextLines.length === 0) {
    throw new DailyContextNotFoundError();
  }

  const [primaryContext, ...historyContexts] = contextLines;

  return buildPreparedInput({
    scenario: "daily",
    mode: options.mode,
    word: wordText,
    primaryContext,
    historyContexts,
    historyContextStatus: historyContexts.length > 0 ? "hit" : "empty",
    maxChars: clampMaxChars(options.maxChars),
  });
};

export const readWordCardV2Cache = async (
  input: PreparedWordCardV2,
  options?: { force?: boolean },
) => {
  if (!ENABLE_WORD_CARD_V2_DB_CACHE) return null;
  if (options?.force) return null;
  const cached = await getCachedGeneration(input.cacheType, input.inputHash);
  return cached?.trim() || null;
};

export const saveWordCardV2Cache = async (
  input: PreparedWordCardV2,
  content: string,
) => {
  if (!ENABLE_WORD_CARD_V2_DB_CACHE) return;
  const normalizedContent = content.trim();
  if (!normalizedContent) return;

  await saveGeneration({
    type: input.cacheType,
    key: input.cacheKey,
    inputHash: input.inputHash,
    content: normalizedContent,
    meta: {
      scenario: input.scenario,
      mode: input.mode,
      word: input.word,
      maxChars: input.maxChars,
      historyContextStatus: input.historyContextStatus,
      model: AI_TEXT_MODEL,
    },
  });
};

export const generateWordCardV2Content = async (
  input: PreparedWordCardV2,
  options?: { force?: boolean },
) => {
  const cached = await readWordCardV2Cache(input, options);
  if (cached) {
    return {
      content: cached,
      cached: true,
    };
  }

  const content = (
    await ai_generateText({
      system: WORD_CARD_V2_PROMPT,
      prompt: input.prompt,
    })
  ).trim();

  await saveWordCardV2Cache(input, content);

  return {
    content,
    cached: false,
  };
};

export const toWordCardV2Response = (
  input: PreparedWordCardV2,
  content: string,
  cached: boolean,
): WordCardV2Result => {
  return {
    type:
      input.scenario === "plugin"
        ? "word_card_plugin_v2"
        : "word_card_daily_v2",
    scenario: input.scenario,
    mode: input.mode,
    word: input.word,
    primaryContext: input.primaryContext,
    historyContextStatus: input.historyContextStatus,
    historyContexts: input.historyContexts,
    content,
    cached,
  };
};
