import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostService } from "@/lib/posts";
import { blogPostPath } from "@/lib/seo";
import { notFoundMetadata, PostPage, postMetadata, RawPostPage } from "../post-page";

export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await PostService.getSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

/** `/blog/<slug>.md` 显示原文 Markdown 源码 */
function parseSlug(rawSlug: string) {
  const decodedSlug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = decodedSlug.endsWith(".md");
  return { slug: isRawMarkdownMode ? decodedSlug.slice(0, -3) : decodedSlug, isRawMarkdownMode };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug, isRawMarkdownMode } = parseSlug((await params).slug);
  const post = await PostService.getPostBySlug(slug);

  return post ? postMetadata(post, post, { raw: isRawMarkdownMode }) : notFoundMetadata();
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug, isRawMarkdownMode } = parseSlug((await params).slug);
  const post = await PostService.getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  if (isRawMarkdownMode) {
    const rawMarkdown = await PostService.getRawMarkdownBySlug(slug);

    if (!rawMarkdown) {
      notFound();
    }

    return <RawPostPage title={post.title} markdown={rawMarkdown} backHref={blogPostPath(slug)} />;
  }

  return <PostPage original={post} post={post} />;
}
