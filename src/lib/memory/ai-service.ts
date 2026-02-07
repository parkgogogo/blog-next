import { ai_generateObject, ai_generateText, AI_TEXT_MODEL } from "@/lib/ai";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
} from "@/lib/ai-cache";
import { memoryCardsContentSchema } from "@/lib/schemas/memory";
import { MEMORY_CARDS_PROMPT } from "@/lib/memory/constants";

type RawContextRecord = {
  context_line: string;
  source_text: string;
  context: string;
  created_at: string;
};

type MemoryCardDraft = {
  words: string[];
  sentence: string;
};

type MemoryCardsContent = {
  cards: MemoryCardDraft[];
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeWordToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();

const buildWordLookup = (words: string[]) => {
  const lookup = new Map<string, string>();
  for (const word of words) {
    const normalized = normalizeWordToken(word);
    if (!normalized) continue;
    if (!lookup.has(normalized)) {
      lookup.set(normalized, word);
    }
  }
  return lookup;
};

const parseJSONFromModel = (raw: string) => {
  const attempt = (value: string) => JSON.parse(value) as { cards?: unknown[] };
  try {
    return attempt(raw);
  } catch {
    const trimmed = raw.trim().replace(/^```json/i, "").replace(/```$/, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return attempt(trimmed.slice(start, end + 1));
    }
    throw new Error("invalid_memory_cards_json");
  }
};

const parseMemoryCardsContent = (raw: string): MemoryCardsContent => {
  const parsed = parseJSONFromModel(raw);
  const validated = memoryCardsContentSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("invalid_memory_cards_json");
  }

  return {
    cards: validated.data.cards.map((card) => ({
      words: card.words,
      sentence: card.sentence,
    })),
  };
};

const normalizeCards = (raw: unknown[], words: string[]) => {
  const lookup = buildWordLookup(words);
  const cards: MemoryCardDraft[] = [];

  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const item = value as { words?: unknown; sentence?: unknown };
    if (!Array.isArray(item.words) || typeof item.sentence !== "string") {
      continue;
    }

    const resolvedWords = item.words
      .map((word) => (typeof word === "string" ? lookup.get(normalizeWordToken(word)) : ""))
      .filter(Boolean) as string[];
    const uniqueWords = Array.from(new Set(resolvedWords)).slice(0, 3);
    const sentence = normalizeText(item.sentence);
    if (uniqueWords.length === 0 || !sentence) continue;

    cards.push({
      words: uniqueWords,
      sentence,
    });
  }

  return cards;
};

export const generateMemoryCards = async (options: {
  words: string[];
  maxChars: number;
  maxSentences: number;
  maxWordsPerCard: number;
  taskDate: string;
  contexts: Record<string, RawContextRecord[]>;
  force?: boolean;
}) => {
  const promptPayload = {
    words: options.words,
    max_chars: options.maxChars,
    max_sentences: options.maxSentences,
    max_words_per_card: Math.min(3, Math.max(1, options.maxWordsPerCard)),
    raw_contexts_by_word: options.contexts,
  };
  const prompt = JSON.stringify(promptPayload, null, 2);
  const inputHash = createInputHash({
    version: 1,
    type: "memory_cards",
    system: MEMORY_CARDS_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
    taskDate: options.taskDate,
  });
  const key = `MEMORY_CARDS_${options.taskDate}_${inputHash.slice(0, 12)}`;

  if (!options.force) {
    const cached = await getCachedGeneration("memory_cards", inputHash);
    if (cached) {
      const parsed = parseMemoryCardsContent(cached);
      return normalizeCards(parsed.cards, options.words);
    }
  }

  try {
    const parsed = await ai_generateObject({
      system: MEMORY_CARDS_PROMPT,
      prompt,
      schema: memoryCardsContentSchema,
      schemaName: "memory_cards",
      schemaDescription:
        "Daily memory cards with 1-3 words per card and one sentence per card.",
    });

    await saveGeneration({
      type: "memory_cards",
      key,
      inputHash,
      content: JSON.stringify(parsed),
      meta: {
        words: options.words,
        contexts: options.contexts,
        model: AI_TEXT_MODEL,
        taskDate: options.taskDate,
      },
    });

    return normalizeCards(parsed.cards, options.words);
  } catch {
    const result = await ai_generateText({
      system: MEMORY_CARDS_PROMPT,
      prompt,
    });
    const parsed = parseMemoryCardsContent(result);

    await saveGeneration({
      type: "memory_cards",
      key,
      inputHash,
      content: result,
      meta: {
        words: options.words,
        contexts: options.contexts,
        model: AI_TEXT_MODEL,
        taskDate: options.taskDate,
        fallback: "text_parse",
      },
    });

    return normalizeCards(parsed.cards, options.words);
  }
};
