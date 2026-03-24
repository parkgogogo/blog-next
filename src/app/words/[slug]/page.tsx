import { WordsService } from "@/lib/words";
import { DailyWordsSection } from "@/app/words/[slug]/components/daily-words-section";
import { requireAuth } from "@/lib/auth/server";

export default async function DailyWordsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await requireAuth();
  const { slug } = await params;

  const dailyWords = await WordsService.getWordsByDate(slug, {
    accessToken: auth.accessToken,
  });
  const nextSlug = await WordsService.getNextWordsGroupKey(slug, {
    accessToken: auth.accessToken,
  });

  return (
    <DailyWordsSection
      slug={slug}
      words={dailyWords}
      nextSlug={nextSlug}
      showNextLink
      className="p-8"
    />
  );
}
