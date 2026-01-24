import { ai_generateText, AI_TEXT_MODEL } from "@/lib/ai";
import {
  createInputHash,
  getCachedGeneration,
  saveGeneration,
} from "@/lib/ai-cache";
import type { ILuluWord } from "@/lib/words/types";

const STORY_SYSTEM_PROMPT = `
You are a creative writing assistant. Write a short, fun English paragraph using the given word list.
Requirements:
1) Length: around 80-140 words.
2) Must include every given word exactly as provided (no case changes, no inflections).
3) Wrap each word with [[word]].
4) The meaning of each word in the story must match the sense in its example sentence.
5) Use simple, common vocabulary (around CET-4 / CEFR B1 level), with short, clear sentences.
6) Output only the paragraph body—no title, list, explanation, or extra text.
`;

const ensureStoryContainsAllWords = (story: string, words: string[]) => {
  const missing = words.filter((word) => !story.includes(`[[${word}]]`));
  if (missing.length === 0) return story;
  const tail = missing.map((word) => `[[${word}]]`).join(" ");
  return `${story.trim()}\n\nAdditional words: ${tail}.`;
};

export const getDailyStory = async (
  words: ILuluWord[],
  dateSlug: string,
  options?: { force?: boolean },
) => {
  const wordList = words.map((word) => word.uuid).filter(Boolean);
  if (wordList.length === 0) return "";

  const contextLines = words
    .map((word) => `- ${word.uuid}: ${word.context.line || ""}`)
    .join("\n");
  const basePrompt = `Word list: ${wordList.join(", ")}\n\nExample sentences:\n${contextLines}`;
  const inputHash = createInputHash({
    version: 1,
    type: "daily_story",
    system: STORY_SYSTEM_PROMPT,
    prompt: basePrompt,
    model: AI_TEXT_MODEL,
  });
  const cacheKey = `STORY_${dateSlug}`;

  if (!options?.force) {
    const cached = await getCachedGeneration("daily_story", inputHash);
    if (cached) return cached;
  }

  try {
    const generateStory = async (extraInstruction?: string) => {
      const prompt = extraInstruction
        ? `${basePrompt}\n\nAdditional requirement: ${extraInstruction}`
        : basePrompt;
      return Promise.race<string>([
        ai_generateText({
          system: STORY_SYSTEM_PROMPT,
          prompt,
        }),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout")), 8000),
        ),
      ]);
    };

    const story = await generateStory();
    const missing = wordList.filter((word) => !story.includes(`[[${word}]]`));
    const secondTry = missing.length
      ? await generateStory(`Must include these missing words: ${missing.join(", ")}`)
      : story;
    const finalStory = ensureStoryContainsAllWords(secondTry, wordList);
    await saveGeneration({
      type: "daily_story",
      key: cacheKey,
      inputHash,
      content: finalStory,
      meta: {
        dateSlug,
        wordList,
        model: AI_TEXT_MODEL,
      },
    });
    return finalStory;
  } catch {
    const fallback = `今天的单词是：${wordList
      .map((word) => `[[${word}]]`)
      .join(" ")}。`;
    await saveGeneration({
      type: "daily_story",
      key: cacheKey,
      inputHash,
      content: fallback,
      meta: {
        dateSlug,
        wordList,
        model: AI_TEXT_MODEL,
        fallback: true,
      },
    });
    return fallback;
  }
};
