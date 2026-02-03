import type { ILuluWord } from "./types";
import {
  listWordEntriesByDate,
  listWordEntryDates,
  listWordTexts,
  type WordEntryRecord,
} from "@/lib/words/storage";

const toHTML = (wordText: string, contextLine: string) => {
  return `<p><strong>${wordText}</strong><br/>${contextLine}</p>`;
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

  const getAllWordUuids = async (options?: { accessToken?: string | null }) => {
    return await listWordTexts(options);
  };

  const getAllWords = async (options?: { accessToken?: string | null }) => {
    const dates = await listWordEntryDates(options);
    const wordsMap = new Map<string, ILuluWord[]>();
    for (const date of dates) {
      const words = await getWordsByDate(date, options);
      wordsMap.set(date, words);
    }
    return wordsMap;
  };

  return {
    getWordsGroupKeys,
    getAllWords,
    getWordsByDate,
    getAllWordUuids,
  };
})();
