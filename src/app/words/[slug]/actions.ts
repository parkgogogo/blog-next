"use server";

import { ILuluWord } from "@/lib/words/types";
import { getExplanation } from "@/lib/words";
import { ai_generateSpeech, ai_generateText, AI_TEXT_MODEL } from "@/lib/ai";
import { SYSTEM_PROMPT } from "@/lib/words/constants";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
} from "@/lib/ai-cache";

/**
 * 缓存单词释义
 * @param word
 */
export const getExplanationAction = async (
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

  const result = await getExplanation(word);
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

const WORD_CARD_PROMPT = `
你是一名词义解释助手。请根据单词、短文与例句，生成该单词的中文释义与短文例句翻译。
要求：
1) 释义必须与例句中的意思严格一致（以给定例句语境为准）。
2) 从短文中找到包含该单词的句子作为“例句”（去掉 [[ ]] 标记），并给出该句子的中文翻译。
3) 输出使用 Markdown，格式必须是三段，且每段单独成行：
   释义：...

   例句：...

   例句翻译：...
4) 只输出上述三段，不要额外内容。
`;

export const getWordCardAction = async (
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

const FREE_WORD_CARD_PROMPT = `
你是一名词义解释助手。请根据短文语境，生成该英文单词的中文释义与短文例句翻译。
要求：
1) 释义必须基于短文语境，不要给出无关词义。
2) 从短文中找到包含该单词的句子作为“例句”（去掉 [[ ]] 标记），并给出该句子的中文翻译。
3) 输出使用 Markdown，格式必须是三段，且每段单独成行：
   释义：...

   例句：...

   例句翻译：...
4) 只输出上述三段，不要额外内容。
`;

export const getFreeWordCardAction = async (
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

const STORY_TRANSLATE_PROMPT = `
你是一名翻译助手，请将英文短文翻译成自然流畅的中文。
要求：
1) 保持原文语气与段落结构。
2) 将原文中的 [[word]] 英文单词翻译为中文，并用 [[中文]] 标记包裹。
3) 只输出中文译文，不要额外解释。
`;

export const translateStoryAction = async (
  story: string,
  options?: { force?: boolean },
) => {
  const prompt = `story: ${story}`;
  const inputHash = createInputHash({
    version: 1,
    type: "story_translation",
    system: STORY_TRANSLATE_PROMPT,
    prompt,
    model: AI_TEXT_MODEL,
  });
  const key = `STORY_TRANSLATION_${inputHash.slice(0, 12)}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("story_translation", inputHash);
    if (cached) return cached;
  }

  const result = await ai_generateText({
    system: STORY_TRANSLATE_PROMPT,
    prompt,
  });
  await saveGeneration({
    type: "story_translation",
    key,
    inputHash,
    content: result,
    meta: {
      model: AI_TEXT_MODEL,
    },
  });
  return result;
};

export const generateSpeech = async (text: string) => {
  const arrayBuffer = await ai_generateSpeech(text);
  const b = Buffer.from(arrayBuffer);
  return b.toString("base64");
};
