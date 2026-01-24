import {
  LULU_ENDPOINT,
  LULU_ENDPOINT_PRE,
  SYSTEM_PROMPT,
} from "@/lib/words/constants";
import type { ILuluWord, IResponse } from "./types";
import { format } from "date-fns";
import { ai_generateText } from "@/lib/ai";

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 8000,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * 获取生词本总数
 */
const getWordsLength = async () => {
  try {
    const response = await fetchWithTimeout(LULU_ENDPOINT_PRE, {
      headers: {
        ["Cookie"]: process.env.LULU_COOKIE || "",
        ["Content-Type"]: "application/json",
      },
      next: {
        revalidate: 60 * 5,
      },
    });
    const result = await response.json();
    if (typeof result.recordsTotal === "number") {
      return result.recordsTotal;
    }
  } catch {
    return 0;
  }
};

/**
 * 获取单词列表，前 25 个
 */
const getLuLuWords = async () => {
  try {
    const totalLength = await getWordsLength();
    const result = await fetchWithTimeout(`${LULU_ENDPOINT}&length=${totalLength}`, {
      headers: {
        ["Cookie"]: process.env.LULU_COOKIE || "",
        ["Content-Type"]: "application/json",
      },
      next: { revalidate: 60 * 5 },
    });

    const parsedResult: IResponse = await result.json();

    if (Array.isArray(parsedResult.data)) {
      return parsedResult.data;
    }
    return [];
  } catch {
    return [];
  }
};

export const getExplanation = async (word: ILuluWord) => {
  return await ai_generateText({
    system: SYSTEM_PROMPT,
    prompt: `word: ${word.uuid}, context: ${word.context.line || ""}`,
  });
};

const toHTML = (word: ILuluWord) => {
  return `<p><strong>${word.word}</strong><br/>${word.context.line}</p>`;
};

const groupWordsByDate = async (words: ILuluWord[]) => {
  const wordsMap = new Map<string, ILuluWord[]>();

  for (const word of words) {
    const day = format(new Date(word.addtime), "yyyy-MM-dd");
    const wordsOfDay = wordsMap.get(day);
    const parsedWords = { ...word, html: toHTML(word) };
    if (wordsOfDay) {
      wordsOfDay.push(parsedWords);
    } else {
      wordsMap.set(day, [parsedWords]);
    }
  }

  return wordsMap;
};

export const WordsService = (() => {
  let promise: Promise<Map<string, ILuluWord[]>>;

  const check = () => {
    if (!promise) {
      promise = (async () => {
        return groupWordsByDate(await getLuLuWords());
      })();
    }
  };

  const getAllWords = async () => {
    check();
    return await promise;
  };

  const getWordsByDate = async (date: string) => {
    check();
    const wordsMap = await promise;
    return wordsMap.get(date) ?? [];
  };

  const getWordsGroupKeys = async () => {
    check();
    const wordsMap = await promise;
    return Array.from(wordsMap.keys());
  };

  const getAllWordUuids = async () => {
    check();
    const wordsMap = await promise;
    const uuidSet = new Set<string>();
    for (const wordsOfDay of wordsMap.values()) {
      for (const word of wordsOfDay) {
        if (word.uuid) uuidSet.add(word.uuid);
      }
    }
    return Array.from(uuidSet);
  };

  return {
    getWordsGroupKeys,
    getAllWords,
    getWordsByDate,
    getAllWordUuids,
  };
})();
