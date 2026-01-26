import { NextResponse } from "next/server";
import { WordsService } from "@/lib/words";
import { getDailyStory } from "@/lib/words/story";

export const dynamic = "force-dynamic";

const parseLimit = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(20, Math.floor(parsed));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = parseLimit(searchParams.get("limit"), 5);

  const slugs = await WordsService.getWordsGroupKeys();
  if (slugs.length === 0) {
    return NextResponse.json({ error: "no_data" }, { status: 404 });
  }

  const startIndex = before ? slugs.indexOf(before) + 1 : 0;
  const page =
    startIndex > 0 ? slugs.slice(startIndex, startIndex + limit) : slugs.slice(0, limit);

  if (page.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const items = await Promise.all(
    page.map(async (slug) => {
      const words = await WordsService.getWordsByDate(slug);
      const story = await getDailyStory(words, slug);
      return { slug, words, story };
    }),
  );

  const nextCursor = page[page.length - 1] ?? null;
  return NextResponse.json({ items, nextCursor });
}
