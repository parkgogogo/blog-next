import { streamSseText } from "@/lib/ai/streaming";

export type WordCardMode = "brief" | "detail";

export type WordCardStreamMeta = {
  type?: "word_card_plugin_v2" | "word_card_daily_v2";
  scenario?: "plugin" | "daily";
  mode?: WordCardMode;
  word?: string;
  primaryContext?: string;
  historyContextStatus?: "hit" | "empty" | "timeout" | "error";
  historyContexts?: string[];
  cached?: boolean;
};

export type WordCardStreamResult = {
  content: string;
  meta: WordCardStreamMeta | null;
};

const parseJsonData = (data: string) => {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const resolveContent = (streamed: string, donePayload: unknown) => {
  if (streamed.trim()) return streamed;
  if (
    donePayload &&
    typeof donePayload === "object" &&
    "text" in donePayload &&
    typeof (donePayload as { text?: unknown }).text === "string"
  ) {
    return ((donePayload as { text: string }).text || "").trim();
  }
  return "";
};

const streamWordCard = async (options: {
  endpoint: "/api/words/card/plugin" | "/api/words/card/daily";
  payload: Record<string, unknown>;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}): Promise<WordCardStreamResult> => {
  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...options.payload,
      stream: true,
    }),
    signal: options.signal,
  });

  let resolvedMeta: WordCardStreamMeta | null = null;
  let donePayload: unknown = null;

  const text = await streamSseText({
    response,
    onDelta: (delta) => {
      options.onDelta?.(delta);
    },
    onEvent: ({ event, data }) => {
      const payload = parseJsonData(data);
      if (event === "meta" && payload) {
        resolvedMeta = {
          type:
            payload.type === "word_card_plugin_v2" ||
            payload.type === "word_card_daily_v2"
              ? payload.type
              : undefined,
          scenario:
            payload.scenario === "plugin" || payload.scenario === "daily"
              ? payload.scenario
              : undefined,
          mode:
            payload.mode === "brief" || payload.mode === "detail"
              ? payload.mode
              : undefined,
          word: typeof payload.word === "string" ? payload.word : undefined,
          primaryContext:
            typeof payload.primaryContext === "string"
              ? payload.primaryContext
              : undefined,
          historyContextStatus:
            payload.historyContextStatus === "hit" ||
            payload.historyContextStatus === "empty" ||
            payload.historyContextStatus === "timeout" ||
            payload.historyContextStatus === "error"
              ? payload.historyContextStatus
              : undefined,
          historyContexts: Array.isArray(payload.historyContexts)
            ? payload.historyContexts.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined,
          cached: typeof payload.cached === "boolean" ? payload.cached : undefined,
        };
      }
      if (event === "done" && payload) {
        donePayload = payload;
      }
    },
  });

  const content = resolveContent(text, donePayload);
  return {
    content,
    meta: resolvedMeta,
  };
};

export const streamPluginWordCard = async (options: {
  word: string;
  sourceSentence: string;
  mode: WordCardMode;
  force?: boolean;
  maxChars?: number;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}): Promise<WordCardStreamResult> => {
  return streamWordCard({
    endpoint: "/api/words/card/plugin",
    payload: {
      word: options.word,
      sourceSentence: options.sourceSentence,
      mode: options.mode,
      force: options.force,
      maxChars: options.maxChars,
    },
    signal: options.signal,
    onDelta: options.onDelta,
  });
};

export const streamDailyWordCard = async (options: {
  wordId: string;
  mode: WordCardMode;
  force?: boolean;
  maxChars?: number;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}): Promise<WordCardStreamResult> => {
  return streamWordCard({
    endpoint: "/api/words/card/daily",
    payload: {
      wordId: options.wordId,
      mode: options.mode,
      force: options.force,
      maxChars: options.maxChars,
    },
    signal: options.signal,
    onDelta: options.onDelta,
  });
};
