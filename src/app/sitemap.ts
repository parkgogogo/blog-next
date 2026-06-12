import type { MetadataRoute } from "next";
import { PostService } from "@/lib/posts";
import { absoluteUrl, blogPostPath } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await PostService.getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: posts[0]?.date ? new Date(posts[0].date) : new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: posts[0]?.date ? new Date(posts[0].date) : new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(blogPostPath(post.slug)),
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
