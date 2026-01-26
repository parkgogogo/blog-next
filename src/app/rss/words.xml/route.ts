import RSS from "rss";
import { WordsService } from "@/lib/words";

export const dynamic = "force-dynamic";

/**
 * GET /rss/blog
 * Builds an RSS feed from markdown posts fetched via src/lib/posts.ts
 */
export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  const feed = new RSS({
    title: "Park's Daily Words",
    description: "lulu words",
    feed_url: siteUrl,
    site_url: siteUrl,
    image_url: `${siteUrl}/park_logo.svg`,
  });

  try {
    const wordsMap = await WordsService.getAllWords();
    // Fetch each post and add it to the feed

    for (const key of wordsMap.keys()) {
      const dailyWords = wordsMap.get(key);
      if (dailyWords) {
        feed.item({
          title: `Daily Words ${key}`,
          description: "",
          url: `${siteUrl}/words/${key}`,
          date: key,
          custom_elements: [
            {
              "content:encoded": `<![CDATA[
        <div class="post-content">
         ${dailyWords.map((word) => word.html).join("")}
        </div>
      ]]>`,
            },
          ],
        });
      }
    }

    const xml = feed.xml({ indent: true });
    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Failed to build RSS feed", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
