import { WordsService } from "@/lib/words";
import Link from "next/link";

export const NextPage = async ({ currSlug }: { currSlug: string }) => {
  const nextSlug = await (async () => {
    const slugs = (await WordsService.getWordsGroupKeys()).filter(
      (item) => item !== currSlug,
    );

    // 随机从 slugs 中取出一个
    return slugs.length
      ? slugs[crypto.getRandomValues(new Uint32Array(1))[0] % slugs.length]
      : null;
  })();

  console.log(nextSlug);

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
