import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
  blogPostPath,
  postDescription,
  siteConfig,
} from "@/lib/seo";
import RSS from "rss";

export const dynamic = "force-static";

/**
 * GET /rss/blog.xml
 * Builds an RSS feed from markdown posts fetched via src/lib/posts.ts
 */
export async function GET() {
  const feed = new RSS({
    title: "Park's Blog",
    description: siteConfig.description,
    feed_url: absoluteUrl("/rss/blog.xml"),
    site_url: siteConfig.url,
    image_url: absoluteUrl("/park_logo.svg"),
  });

  try {
    const posts = await PostService.getAllPosts();
    // Fetch each post and add it to the feed
    for (const post of posts) {
      feed.item({
        title: post.title,
        description: postDescription(post),
        url: absoluteUrl(blogPostPath(post.slug)),
        guid: absoluteUrl(blogPostPath(post.slug)),
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
