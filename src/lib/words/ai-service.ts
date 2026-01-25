import type { ILuluWord } from "@/lib/words/types";
import { ai_generateText, AI_TEXT_MODEL } from "@/lib/ai";
import {
  SYSTEM_PROMPT,
  WORDS_PAGE_PROMPT,
  WORD_CARD_PROMPT,
  FREE_WORD_CARD_PROMPT,
  WORD_CARD_BUNDLE_PROMPT,
  PASSAGE_TRANSLATE_PROMPT,
  SENTENCE_TRANSLATE_PROMPT,
  CONTEXT_SNIPPET_PROMPT,
} from "@/lib/words/constants";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
} from "@/lib/ai-cache";

export const getStoryExplanation = async (
  word: ILuluWord,
  options?: { force?: boolean },
) => {
  const prompt = `word: ${word.uuid}, context: ${word.context.line || ""}`;
  const inputHash = createInputHash({
    version: 1,
    type: "explanation",
    system: SYSTEM_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });

  if (!options?.force) {
    const cached = await getCachedGeneration("explanation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: SYSTEM_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "explanation",
    key: `EXP_${word.uuid}`,
    inputHash,
    content: result,
    meta: {
      word: word.uuid,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const getWordsPageExplanation = async (
  word: ILuluWord,
  options?: { force?: boolean },
) => {
  const prompt = `word: ${word.uuid}, context: ${word.context.line || ""}`;
  const inputHash = createInputHash({
    version: 1,
    type: "word_page_explanation",
    system: WORDS_PAGE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });

  if (!options?.force) {
    const cached = await getCachedGeneration("word_page_explanation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: WORDS_PAGE_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "word_page_explanation",
    key: `WORD_EXP_${word.uuid}`,
    inputHash,
    content: result,
    meta: {
      word: word.uuid,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const getStoryWordCard = async (
  word: ILuluWord,
  story: string,
  options?: { force?: boolean },
) => {
  const prompt = `word: ${word.uuid}\ncontext: ${word.context.line || ""}\nstory: ${story}`;
  const inputHash = createInputHash({
    version: 1,
    type: "word_card",
    system: WORD_CARD_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const key = `WORD_CARD_${word.uuid}_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("word_card", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: WORD_CARD_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "word_card",
    key,
    inputHash,
    content: result,
    meta: {
      word: word.uuid,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const getFreeWordCard = async (
  word: string,
  story: string,
  options?: { force?: boolean },
) => {
  const prompt = `word: ${word}\nstory: ${story}`;
  const inputHash = createInputHash({
    version: 1,
    type: "free_word_card",
    system: FREE_WORD_CARD_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const safeWord = word
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
  const key = `FREE_WORD_CARD_${safeWord || "WORD"}_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("free_word_card", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: FREE_WORD_CARD_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "free_word_card",
    key,
    inputHash,
    content: result,
    meta: {
      word,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const getFreeExplanation = async (
  word: string,
  contextLine: string,
  options?: { force?: boolean },
) => {
  const prompt = `word: ${word}, context: ${contextLine || ""}`;
  const inputHash = createInputHash({
    version: 1,
    type: "free_explanation",
    system: SYSTEM_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const safeWord = word
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
  const key = `FREE_EXP_${safeWord || "WORD"}_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("free_explanation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: SYSTEM_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "free_explanation",
    key,
    inputHash,
    content: result,
    meta: {
      word,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

const parseBundleContent = (raw: string) => {
  const attemptParse = (value: string) => {
    const parsed = JSON.parse(value) as {
      context?: string;
      brief?: string;
      detail?: string;
    };
    return {
      context: typeof parsed.context === "string" ? parsed.context.trim() : "",
      brief: typeof parsed.brief === "string" ? parsed.brief.trim() : "",
      detail: typeof parsed.detail === "string" ? parsed.detail.trim() : "",
    };
  };

  try {
    return attemptParse(raw);
  } catch {
    const trimmed = raw.trim().replace(/^```json/i, "").replace(/```$/, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return attemptParse(trimmed.slice(start, end + 1));
      } catch {
        // Fall through.
      }
    }
    return {
      context: "",
      brief: trimmed,
      detail: "",
    };
  }
};

export const getWordCardBundle = async (
  word: string,
  sourceText: string,
  options?: { force?: boolean; maxChars?: number },
) => {
  const maxChars = Math.max(80, Math.min(options?.maxChars ?? 160, 320));
  const prompt = `word: ${word}\nsource_text: ${sourceText}\nmax_chars: ${maxChars}`;
  const inputHash = createInputHash({
    version: 1,
    type: "word_card_bundle",
    system: WORD_CARD_BUNDLE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const safeWord = word
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
  const key = `WORD_CARD_BUNDLE_${safeWord || "WORD"}_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("word_card_bundle", inputHash);
    if (cached) return parseBundleContent(cached);
  }

  const result = await ai_generateText({
    system: WORD_CARD_BUNDLE_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "word_card_bundle",
    key,
    inputHash,
    content: result,
    meta: {
      word,
      maxChars,
      model: AI_TEXT_MODEL,
    },
  });
  return parseBundleContent(result);
};

export const translatePassage = async (
  passage: string,
  options?: { force?: boolean },
) => {
  const prompt = `passage: ${passage}`;
  const inputHash = createInputHash({
    version: 1,
    type: "passage_translation",
    system: PASSAGE_TRANSLATE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const key = `PASSAGE_TRANSLATION_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("passage_translation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: PASSAGE_TRANSLATE_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "passage_translation",
    key,
    inputHash,
    content: result,
    meta: {
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const translateSentence = async (
  text: string,
  options?: { force?: boolean },
) => {
  const prompt = `sentence: ${text}`;
  const inputHash = createInputHash({
    version: 1,
    type: "sentence_translation",
    system: SENTENCE_TRANSLATE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const key = `SENTENCE_TRANSLATION_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("sentence_translation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: SENTENCE_TRANSLATE_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "sentence_translation",
    key,
    inputHash,
    content: result,
    meta: {
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const getContextSnippet = async (
  word: string,
  sourceText: string,
  options?: { force?: boolean; maxChars?: number },
) => {
  const maxChars = Math.max(80, Math.min(options?.maxChars ?? 160, 320));
  const prompt = `word: ${word}\nsource_text: ${sourceText}\nmax_chars: ${maxChars}`;
  const inputHash = createInputHash({
    version: 1,
    type: "context_snippet",
    system: CONTEXT_SNIPPET_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const safeWord = word
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
  const key = `CTX_SNIP_${safeWord || "WORD"}_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("context_snippet", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: CONTEXT_SNIPPET_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "context_snippet",
    key,
    inputHash,
    content: result,
    meta: {
      word,
      maxChars,
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};
