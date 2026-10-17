import type { Metadata } from "next";
import Link from "next/link";
import PostArticle from "@/components/PostArticle";
import { LANGUAGE_INFO } from "@/lib/i18n";
import {
  absoluteUrl,
  blogPostPath,
  personJsonLd,
  postDescription,
  postLanguageAlternates,
  postVersions,
  rssAlternateTypes,
  siteConfig,
} from "@/lib/seo";
import type { BlogPost } from "@/types/blog";

/**
 * 原文页 /blog/[slug] 与译文页 /blog/[slug]/[lang] 共用的元数据与渲染。
 * `original` 是原文（带 translations），`post` 是当前要展示的语言版本。
 */

function postPath(original: BlogPost, post: BlogPost): string {
  return blogPostPath(original.slug, post === original ? undefined : post.lang);
}

export function notFoundMetadata(): Metadata {
  return {
    title: "Post not found",
    robots: { index: false, follow: false },
  };
}

export function postMetadata(
  original: BlogPost,
  post: BlogPost,
  { raw = false }: { raw?: boolean } = {}
): Metadata {
  const canonicalPath = postPath(original, post);
  const description = postDescription(post);
  const languages = postLanguageAlternates(original);

  return {
    title: raw ? `${post.title}.md` : post.title,
    description,
    keywords: [...(post.tags ?? []), post.category, siteConfig.author.name, "博客"].filter(Boolean),
    category: post.category || undefined,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    alternates: {
      canonical: canonicalPath,
      types: rssAlternateTypes(),
      ...(languages && { languages }),
    },
    robots: raw ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      url: canonicalPath,
      title: post.title,
      description,
      siteName: siteConfig.name,
      locale: LANGUAGE_INFO[post.lang].ogLocale,
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [siteConfig.author.name],
      tags: post.tags,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
  };
}

export function PostPage({ original, post }: { original: BlogPost; post: BlogPost }) {
  const url = absoluteUrl(postPath(original, post));
  const versions = postVersions(original);
  const otherVersions = versions.filter((version) => version.post !== post);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    headline: post.title,
    description: postDescription(post),
    url,
    mainEntityOfPage: url,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: LANGUAGE_INFO[post.lang].hreflang,
    author: personJsonLd(),
    publisher: personJsonLd(),
    articleSection: post.category || undefined,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    timeRequired: post.readingTime ? `PT${post.readingTime}M` : undefined,
    ...(post !== original && {
      translationOfWork: { "@id": absoluteUrl(blogPostPath(original.slug)) },
    }),
    ...(post === original &&
      otherVersions.length > 0 && {
        workTranslation: otherVersions.map((version) => ({ "@id": absoluteUrl(version.path) })),
      }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <PostArticle
        post={post}
        versions={
          versions.length > 1
            ? versions.map((version) => ({
                lang: version.lang,
                href: version.path,
                current: version.post === post,
              }))
            : undefined
        }
      />
    </>
  );
}

export function RawPostPage({
  title,
  markdown,
  backHref,
}: {
  title: string;
  markdown: string;
  backHref: string;
}) {
  return (
    <div className="raw-source">
      <Link href={backHref} className="raw-source__back">
        ← Rendered post
      </Link>
      <h1 className="raw-source__title">{title}.md</h1>
      <pre>
        <code>{markdown}</code>
      </pre>
    </div>
  );
}
