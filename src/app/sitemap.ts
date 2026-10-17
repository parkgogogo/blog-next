import type { MetadataRoute } from "next";
import { PostService } from "@/lib/posts";
import { absoluteUrl, postLanguageAlternates, postVersions } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await PostService.getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: posts[0]?.date ? new Date(posts[0].date) : new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // 每个语言版本一条，多语言文章互相声明 hreflang
  const postRoutes: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const languages = postLanguageAlternates(post);
    return postVersions(post).map((version) => ({
      url: absoluteUrl(version.path),
      lastModified: version.post.date ? new Date(version.post.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(languages && { alternates: { languages } }),
    }));
  });

  return [...staticRoutes, ...postRoutes];
}
