import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";
import { DailyStorySection } from "@/app/words/[slug]/components/daily-story-section";
import { requireAuth } from "@/lib/auth/server";

export default async function DailyStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await requireAuth();
  const { slug } = await params;
  const dailyWords = await WordsService.getWordsByDate(slug, {
    accessToken: auth.accessToken,
  });
  const story = await getDailyStory(dailyWords, slug);

  return (
    <DailyStorySection
      slug={slug}
      story={story}
      words={dailyWords}
      className="p-4 md:p-8"
    />
  );
}
