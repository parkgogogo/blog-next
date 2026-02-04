import { ai_generateText, AI_TEXT_MODEL } from "@/lib/ai";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
} from "@/lib/ai-cache";
import {
  MEMORY_GROUP_PROMPT,
  MEMORY_SENTENCE_PROMPT,
} from "@/lib/memory/constants";

const normalizeSentence = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const normalizeWordToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countWordOccurrences = (sentence: string, word: string) => {
  const normalizedSentence = sentence.toLowerCase();
  const target = normalizeWordToken(word);
  if (!target) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, "g");
  return normalizedSentence.match(pattern)?.length ?? 0;
};

const includesAllWords = (sentence: string, words: string[]) => {
  const lower = sentence.toLowerCase();
  return words.every((word) => lower.includes(word.toLowerCase()));
};

export const generateMemorySentence = async (options: {
  words: string[];
  maxChars: number;
  maxSentences: number;
  taskDate: string;
  contexts: Record<string, string>;
  force?: boolean;
}) => {
  const contextLines = options.words
    .map((word) => `- ${word}: ${options.contexts[word] || ""}`)
    .join("\n");
  const prompt = `words: ${options.words.join(", ")}\nmax_chars: ${options.maxChars}\nmax_sentences: ${options.maxSentences}\ncontexts:\n${contextLines}`;
  const inputHash = createInputHash({
    version: 1,
    type: "memory_sentence",
    system: MEMORY_SENTENCE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
    taskDate: options.taskDate,
  });
  const key = `MEMORY_SENT_${options.taskDate}_${inputHash.slice(0, 12)}`;

  if (!options.force) {
    const cached = await getCachedGeneration("memory_sentence", inputHash);
    if (cached) return normalizeSentence(cached);
  }

  const result = await ai_generateText({
    system: MEMORY_SENTENCE_PROMPT,
    prompt,
  });
  const normalized = normalizeSentence(result);
  await saveGeneration({
    type: "memory_sentence",
    key,
    inputHash,
    content: normalized,
    meta: {
      words: options.words,
      contexts: options.contexts,
      model: AI_TEXT_MODEL,
      taskDate: options.taskDate,
    },
  });

  return normalized;
};

export const buildFallbackSentence = (words: string[]) => {
  if (words.length === 1) {
    return `Today I learned the word ${words[0]}.`;
  }
  if (words.length === 2) {
    return `Today I learned ${words[0]} and ${words[1]}.`;
  }
  const tail = words[words.length - 1];
  const head = words.slice(0, -1).join(", ");
  return `Today I learned ${head}, and ${tail}.`;
};

export const ensureMemorySentence = async (options: {
  words: string[];
  maxChars: number;
  maxSentences: number;
  taskDate: string;
  contexts: Record<string, string>;
  force?: boolean;
}) => {
  try {
    const attempts = [false, true];
    for (const strict of attempts) {
      const result = await generateMemorySentence({
        ...options,
        force: options.force || strict,
      });
      const normalized = normalizeSentence(result);
      const sentenceCount =
        normalized.split(/[.!?]+/).filter(Boolean).length || 1;
      if (
        normalized.length <= options.maxChars &&
        sentenceCount <= options.maxSentences &&
        includesAllWords(normalized, options.words)
      ) {
        if (options.words.length === 1) {
          const occurrences = countWordOccurrences(
            normalized,
            options.words[0],
          );
          if (occurrences > 1) {
            continue;
          }
        }
        return normalized;
      }
    }
  } catch {
    // Fall through to fallback.
  }

  return buildFallbackSentence(options.words);
};

const buildWordLookup = (words: string[]) => {
  const lookup = new Map<string, string>();
  for (const word of words) {
    const normalized = normalizeWordToken(word);
    if (!normalized) continue;
    if (!lookup.has(normalized)) {
      lookup.set(normalized, word);
    }
    if (normalized.endsWith("ies")) {
      const variant = `${normalized.slice(0, -3)}y`;
      if (!lookup.has(variant)) lookup.set(variant, word);
    }
    if (normalized.endsWith("es")) {
      const variant = normalized.slice(0, -2);
      if (!lookup.has(variant)) lookup.set(variant, word);
    }
    if (normalized.endsWith("s")) {
      const variant = normalized.slice(0, -1);
      if (!lookup.has(variant)) lookup.set(variant, word);
    }
  }
  return lookup;
};

const parseGrouping = (raw: string, words: string[]) => {
  const lookup = buildWordLookup(words);
  const attempt = (value: string) => {
    const parsed = JSON.parse(value) as { groups?: string[][] };
    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    return groups
      .map((group) =>
        group
          .map((word) => lookup.get(normalizeWordToken(word)) ?? "")
          .filter(Boolean),
      )
      .filter((group) => group.length > 0);
  };

  try {
    return attempt(raw);
  } catch {
    const trimmed = raw.trim().replace(/^```json/i, "").replace(/```$/, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return attempt(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeGroups = (groups: string[][], words: string[]) => {
  const seen = new Set<string>();
  const allowed = new Set(words.map((word) => word.toLowerCase()));
  const normalized: string[][] = [];
  for (const group of groups) {
    const cleaned = group
      .map((word) => word.trim())
      .filter(Boolean)
      .filter((word) => allowed.has(word.toLowerCase()))
      .filter((word) => {
        const key = word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
    if (cleaned.length > 0) {
      normalized.push(cleaned);
    }
  }

  const missing = words.filter((word) => !seen.has(word.toLowerCase()));
  for (const word of missing) {
    normalized.push([word]);
  }

  return normalized;
};

export const groupMemoryWords = async (options: {
  words: string[];
  taskDate: string;
  contexts: Record<string, string>;
  force?: boolean;
}) => {
  const contextLines = options.words
    .map((word) => `- ${word}: ${options.contexts[word] || ""}`)
    .join("\n");
  const prompt = `words: ${options.words.join(", ")}\ncontexts:\n${contextLines}`;
  const inputHash = createInputHash({
    version: 1,
    type: "memory_grouping",
    system: MEMORY_GROUP_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
    taskDate: options.taskDate,
  });
  const key = `MEMORY_GROUP_${options.taskDate}_${inputHash.slice(0, 12)}`;

  if (!options.force) {
    const cached = await getCachedGeneration("memory_grouping", inputHash);
    if (cached) {
      const parsed = parseGrouping(cached, options.words);
      if (parsed) {
        return normalizeGroups(parsed, options.words);
      }
    }
  }

  try {
    const result = await ai_generateText({
      system: MEMORY_GROUP_PROMPT,
      prompt,
    });

    await saveGeneration({
      type: "memory_grouping",
      key,
      inputHash,
    content: result,
    meta: {
      words: options.words,
      contexts: options.contexts,
      model: AI_TEXT_MODEL,
      taskDate: options.taskDate,
    },
    });

    const parsed = parseGrouping(result, options.words);
    if (!parsed) {
      return options.words.map((word) => [word]);
    }
    return normalizeGroups(parsed, options.words);
  } catch {
    const fallback: string[][] = [];
    for (let i = 0; i < options.words.length; i += 4) {
      fallback.push(options.words.slice(i, i + 4));
    }
    return fallback;
  }
};
