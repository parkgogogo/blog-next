"use server";

import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";

export const regenerateStoryAction = async (slug: string) => {
  const dailyWords = await WordsService.getWordsByDate(slug);
  await getDailyStory(dailyWords, slug, { force: true });
};
