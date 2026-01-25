import Link from "next/link";
import { WordsService } from "@/lib/words";
import { ContextLine } from "@/app/words/[slug]/components/context-line";
import { Index } from "@/app/words/[slug]/components/word";

export default async function DailyWordsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const dailyWords = await WordsService.getWordsByDate(slug);
  const nextSlug = await (async () => {
    const slugs = (await WordsService.getWordsGroupKeys()).filter(
      (item) => item !== slug,
    );
    return slugs.length
      ? slugs[crypto.getRandomValues(new Uint32Array(1))[0] % slugs.length]
      : null;
  })();

  return (
    <div className="p-8">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-medium font-display text-foreground leading-tight tracking-tight mt-0">
            {slug} Daily Words
          </h1>
          <Link
            className="text-sm text-orange-500 hover:text-orange-600 underline underline-offset-4"
            href={`/words/${slug}/story`}
          >
            今日短文
          </Link>
        </div>
        <div className="markdown-body">
          {dailyWords.map((word) => (
            <div key={word.uuid}>
              <Index text={word.uuid} phon={word.phon} />
              <ContextLine word={word} />
            </div>
          ))}
        </div>
        {nextSlug && (
          <div className="mt-12 text-lg text-orange-400 font-semibold underline">
            <Link
              href={`/words/${nextSlug}`}
            >{`> Next: ${nextSlug} Daily words`}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
