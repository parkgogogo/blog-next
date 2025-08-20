import { WordsService } from "@/lib/words";
import { ContextLine } from "@/app/words/[slug]/components/context-line";
import { Index } from "@/app/words/[slug]/components/word";
import { NextPage } from "@/app/words/[slug]/components/next-page";

export default async function DailyWordsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const dailyWords = await WordsService.getWordsByDate(slug);

  return (
    <div className="p-8">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-3xl font-medium font-display text-foreground mb-4 leading-tight tracking-tight mt-0">
          {slug} Daily Words
        </h1>
        <div className="markdown-body">
          {dailyWords.map((word) => (
            <div key={word.uuid}>
              <Index text={word.uuid} phon={word.phon} />
              <ContextLine word={word} />
            </div>
          ))}
        </div>
        <NextPage currSlug={slug} />
      </div>
    </div>
  );
}
