import type { ILuluWord } from "./types";
import {
  listWordEntriesByDate,
  listWordEntryDates,
  listWordTexts,
  listAllWordEntries,
  type WordEntryRecord,
} from "@/lib/words/storage";

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

const toHTML = (wordText: string, contextLine: string) => {
  const escapedWord = escapeHtml(wordText);
  const escapedContext = escapeHtml(contextLine);
  return `<p><strong>${escapedWord}</strong><br/>${escapedContext}</p>`;
};

const toWord = (entry: WordEntryRecord): ILuluWord => {
  const wordText = entry.wordText || "";
  const contextLine =
    entry.contextLine || entry.sourceText || entry.context || "";

  return {
    id: entry.id,
    uuid: wordText,
    word: wordText,
    exp: "",
    addtime: entry.createdAt,
    context: { line: contextLine },
    phon: "",
    html: toHTML(wordText, contextLine),
    sourceLink: entry.sourceLink,
  };
};

const getNextWordGroupKeyFromList = (slugs: string[], currentSlug: string) => {
  const sorted = Array.from(new Set(slugs)).sort((left, right) =>
    left.localeCompare(right),
  );
  if (sorted.length === 0) return null;
  if (sorted.length === 1) {
    return sorted[0] === currentSlug ? null : (sorted[0] ?? null);
  }

  const currentIndex = sorted.indexOf(currentSlug);
  if (currentIndex < 0) {
    return sorted[0] ?? null;
  }

  return sorted[(currentIndex + 1) % sorted.length] ?? null;
};

export const WordsService = (() => {
  const getWordsByDate = async (
    date: string,
    options?: { accessToken?: string | null },
  ) => {
    const entries = await listWordEntriesByDate(date, options);
    return entries.map(toWord);
  };

  const getWordsGroupKeys = async (options?: { accessToken?: string | null }) => {
    return await listWordEntryDates(options);
  };

  const getNextWordsGroupKey = async (
    currentSlug: string,
    options?: { accessToken?: string | null },
  ) => {
    const slugs = await getWordsGroupKeys(options);
    return getNextWordGroupKeyFromList(slugs, currentSlug);
  };

  const getAllWordUuids = async (options?: { accessToken?: string | null }) => {
    return await listWordTexts(options);
  };

  const getAllWords = async (options?: { accessToken?: string | null }) => {
    const entriesByDate = await listAllWordEntries(options);
    const wordsMap = new Map<string, ILuluWord[]>();
    for (const [date, entries] of entriesByDate) {
      wordsMap.set(date, entries.map(toWord));
    }
    return wordsMap;
  };

  return {
    getWordsGroupKeys,
    getNextWordsGroupKey,
    getAllWords,
    getWordsByDate,
    getAllWordUuids,
  };
})();
