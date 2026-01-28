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
  const getWordsByDate = async (date: string) => {
    const entries = await listWordEntriesByDate(date);
    return entries.map(toWord);
  };

  const getWordsGroupKeys = async () => {
    return await listWordEntryDates();
  };

  const getAllWordUuids = async () => {
    return await listWordTexts();
  };

  const getAllWords = async () => {
    const dates = await listWordEntryDates();
    const wordsMap = new Map<string, ILuluWord[]>();
    for (const date of dates) {
      const words = await getWordsByDate(date);
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
