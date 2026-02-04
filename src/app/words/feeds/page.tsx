import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";
import { FeedsClient } from "@/app/words/feeds/feeds-client";
import { requireAuth } from "@/lib/auth/server";

const FEED_DAYS = 5;

export default async function WordsFeedsPage() {
  const auth = await requireAuth();
  const slugs = await WordsService.getWordsGroupKeys({
    accessToken: auth.accessToken,
  });
  const feedSlugs = slugs.slice(0, FEED_DAYS);

  const feedItems = await Promise.all(
    feedSlugs.map(async (slug) => {
      const words = await WordsService.getWordsByDate(slug, {
        accessToken: auth.accessToken,
      });
      const story = await getDailyStory(words, slug);
      return { slug, words, story };
    }),
  );

  return <FeedsClient initialItems={feedItems} />;
}
