import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";
import { DailyStory } from "@/app/words/[slug]/components/daily-story";
import { StoryActions } from "@/app/words/[slug]/story/story-actions";
import Link from "next/link";

export default async function DailyStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dailyWords = await WordsService.getWordsByDate(slug);
  const story = await getDailyStory(dailyWords, slug);

  return (
    <div className="story-page p-4 md:p-8">
      <div className="story-shell max-w-[980px] mx-auto space-y-6">
        <div className="space-y-3">
          <div className="story-kicker">Daily Words Dispatch</div>
          <h1 className="story-headline">{slug} Daily Story</h1>
          <StoryActions slug={slug} />
          <div className="story-rule" />
        </div>

        {story ? (
          <DailyStory story={story} words={dailyWords} />
        ) : (
          <div className="text-gray-500">暂无可用单词。</div>
        )}

        <div className="pt-6">
          <Link
            className="story-backlink"
            href={`/words/${slug}`}
          >
            返回单词页
          </Link>
        </div>
      </div>
    </div>
  );
}
