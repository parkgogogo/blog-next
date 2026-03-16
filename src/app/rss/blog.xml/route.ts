import { PostService } from "@/lib/posts";
import RSS from "rss";

export const dynamic = "force-static";

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
    title: "Park's Blog",
    description: "Latest posts",
    feed_url: `${siteUrl}/rss/blog`,
    site_url: siteUrl,
    image_url: `${siteUrl}/park_logo.svg`,
  });

  try {
    const posts = await PostService.getAllPosts();
    // Fetch each post and add it to the feed
    for (const post of posts) {
      feed.item({
        title: post.title,
        description: post.excerpt ?? "",
        url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
        guid: `${siteUrl}/blog/${post.slug}`,
        date: post.date,
        // include full content as CDATA so HTML/markdown won't break the feed
        custom_elements: [{ "content:encoded": { _cdata: post.content } }],
      });
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
