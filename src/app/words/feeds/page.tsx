import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";
import { FeedsClient } from "@/app/words/feeds/feeds-client";

const FEED_DAYS = 5;

export default async function WordsFeedsPage() {
  const slugs = await WordsService.getWordsGroupKeys();
  const feedSlugs = slugs.slice(0, FEED_DAYS);

  const feedItems = await Promise.all(
    feedSlugs.map(async (slug) => {
      const words = await WordsService.getWordsByDate(slug);
      const story = await getDailyStory(words, slug);
      return { slug, words, story };
    }),
  );

  return <FeedsClient initialItems={feedItems} />;
}
