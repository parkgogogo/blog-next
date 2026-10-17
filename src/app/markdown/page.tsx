import type { Metadata } from "next";
import PostArticle from "@/components/PostArticle";
import { readMarkdownTestContent } from "@/lib/markdown/test-content";
import { parsePost } from "@/lib/posts";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Markdown rendering test",
  robots: { index: false, follow: false },
};

/**
 * 覆盖所有 Markdown 渲染 case 的测试页，不进入 sitemap
 */
export default async function MarkdownTestPage() {
  const post = parsePost(await readMarkdownTestContent(), "markdown", "markdown");
  return <PostArticle post={post} />;
}
