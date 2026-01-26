import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";
import { FeedsClient } from "@/app/words/feeds/feeds-client";

const FEED_DAYS = 5;

const shuffleSlugs = (slugs: string[]) => {
  const result = [...slugs];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const j = Math.floor(rand * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export default async function WordsFeedsPage() {
  const slugs = await WordsService.getWordsGroupKeys();
  const feedSlugs = shuffleSlugs(slugs).slice(0, FEED_DAYS);

  const feedItems = await Promise.all(
    feedSlugs.map(async (slug) => {
      const words = await WordsService.getWordsByDate(slug);
      const story = await getDailyStory(words, slug);
      return { slug, words, story };
    }),
  );

  return <FeedsClient initialItems={feedItems} />;
}
