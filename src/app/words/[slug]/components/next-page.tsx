import { WordsService } from "@/lib/words";
import Link from "next/link";

export const NextPage = async ({ currSlug }: { currSlug: string }) => {
  const nextSlug = await WordsService.getNextWordsGroupKey(currSlug);

  if (nextSlug) {
    return (
      <div className="mt-12 text-lg text-orange-400 font-semibold underline">
        <Link
          href={`/words/${nextSlug}`}
        >{`> Next: ${nextSlug} Daily words`}</Link>
      </div>
    );
  }

  return null;
};
