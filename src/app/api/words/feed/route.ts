import { NextResponse } from "next/server";
import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";

export const dynamic = "force-dynamic";

const pickRandomSlug = (slugs: string[]) => {
  if (slugs.length === 0) return null;
  const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  const index = Math.floor(rand * slugs.length);
  return slugs[index] ?? null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exclude = new Set(
    (searchParams.get("exclude") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const slugs = await WordsService.getWordsGroupKeys();
  const candidates = slugs.filter((slug) => !exclude.has(slug));
  const pool = candidates.length > 0 ? candidates : slugs;
  const slug = pickRandomSlug(pool);

  if (!slug) {
    return NextResponse.json({ error: "no_data" }, { status: 404 });
  }

  const words = await WordsService.getWordsByDate(slug);
  const story = await getDailyStory(words, slug);
  return NextResponse.json({ slug, words, story });
}
