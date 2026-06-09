import RSS from "rss";
import { WordsService } from "@/lib/words";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * GET /rss/words.xml
 * Builds an RSS feed from markdown posts fetched via src/lib/posts.ts
 */
export async function GET() {
  const feed = new RSS({
    title: "Park's Daily Words",
    description: "lulu words",
    feed_url: absoluteUrl("/rss/words.xml"),
    site_url: siteConfig.url,
    image_url: absoluteUrl("/park_logo.svg"),
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
          url: absoluteUrl(`/words/${key}`),
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
