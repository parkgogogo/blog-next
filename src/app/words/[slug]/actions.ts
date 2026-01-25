"use server";

import { ILuluWord } from "@/lib/words/types";
import { ai_generateSpeech } from "@/lib/ai";
import {
  getStoryExplanation,
  getStoryWordCard,
  getFreeExplanation,
  getFreeWordCard,
  getStoryContextSnippet,
  getWordCardBundle,
  translateStory,
} from "@/lib/words/ai-service";

/**
 * 缓存单词释义
 * @param word
 */
export const getExplanationAction = async (
  word: ILuluWord,
  options?: { force?: boolean },
) => {
  return await getStoryExplanation(word, options);
};

export const getWordCardAction = async (
  word: ILuluWord,
  story: string,
  options?: { force?: boolean },
) => {
  return await getStoryWordCard(word, story, options);
};

export const getFreeWordCardAction = async (
  word: string,
  story: string,
  options?: { force?: boolean },
) => {
  return await getFreeWordCard(word, story, options);
};

export const getFreeExplanationAction = async (
  word: string,
  contextLine: string,
  options?: { force?: boolean },
) => {
  return await getFreeExplanation(word, contextLine, options);
};

export const translateStoryAction = async (
  story: string,
  options?: { force?: boolean },
) => {
  return await translateStory(story, options);
};

export const generateSpeech = async (text: string) => {
  const arrayBuffer = await ai_generateSpeech(text);
  const b = Buffer.from(arrayBuffer);
  return b.toString("base64");
};

export const getStoryContextSnippetAction = async (
  word: string,
  story: string,
  options?: { force?: boolean; maxChars?: number },
) => {
  return await getStoryContextSnippet(word, story, options);
};

export const getWordCardBundleAction = async (
  word: string,
  story: string,
  options?: { force?: boolean; maxChars?: number },
) => {
  return await getWordCardBundle(word, story, options);
};
