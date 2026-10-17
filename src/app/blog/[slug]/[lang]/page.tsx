import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isPostLanguage } from "@/lib/i18n";
import { PostService } from "@/lib/posts";
import { blogPostPath } from "@/lib/seo";
import { notFoundMetadata, PostPage, postMetadata, RawPostPage } from "../../post-page";

export const revalidate = false;

/** 译文页：/blog/<slug>/<lang>，`/blog/<slug>/<lang>.md` 显示译文源码 */
export async function generateStaticParams() {
  return PostService.getTranslationParams();
}

async function loadTranslation(params: Promise<{ slug: string; lang: string }>) {
  const { slug: rawSlug, lang: rawLang } = await params;
  const slug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = rawLang.endsWith(".md");
  const lang = isRawMarkdownMode ? rawLang.slice(0, -3) : rawLang;

  const original = await PostService.getPostBySlug(slug);
  // 原文语言不走这个路由，避免同一内容出现在两个地址
  if (!original || !isPostLanguage(lang) || lang === original.lang) return null;

  const post = original.translations?.[lang];
  return post ? { original, post, isRawMarkdownMode } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lang: string }>;
}): Promise<Metadata> {
  const found = await loadTranslation(params);

  return found
    ? postMetadata(found.original, found.post, { raw: found.isRawMarkdownMode })
    : notFoundMetadata();
}

export default async function BlogPostTranslationPage({
  params,
}: {
  params: Promise<{ slug: string; lang: string }>;
}) {
  const found = await loadTranslation(params);

  if (!found) {
    notFound();
  }

  const { original, post, isRawMarkdownMode } = found;

  if (isRawMarkdownMode) {
    return (
      <RawPostPage
        title={post.title}
        markdown={post.rawMarkdown || post.content}
        backHref={blogPostPath(original.slug, post.lang)}
      />
    );
  }

  return <PostPage original={original} post={post} />;
}
