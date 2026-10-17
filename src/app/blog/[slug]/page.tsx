import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PostArticle from "@/components/PostArticle";
import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
  blogPostPath,
  postDescription,
  rssAlternateTypes,
  siteConfig,
  personJsonLd,
} from "@/lib/seo";

export const revalidate = false;

export async function generateStaticParams() {
  const slugs = await PostService.getSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const decodedSlug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = decodedSlug.endsWith(".md");
  const slug = isRawMarkdownMode ? decodedSlug.slice(0, -3) : decodedSlug;
  const post = await PostService.getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = blogPostPath(post.slug);
  const description = postDescription(post);
  const title = isRawMarkdownMode ? `${post.title}.md` : post.title;

  return {
    title,
    description,
    keywords: [...(post.tags ?? []), post.category, siteConfig.author.name, "博客"].filter(
      Boolean
    ),
    category: post.category || undefined,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    alternates: {
      canonical: canonicalPath,
      types: rssAlternateTypes(),
    },
    robots: isRawMarkdownMode
      ? {
          index: false,
          follow: true,
        }
      : undefined,
    openGraph: {
      type: "article",
      url: canonicalPath,
      title: post.title,
      description,
      siteName: siteConfig.name,
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const decodedSlug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = decodedSlug.endsWith(".md");
  const slug = isRawMarkdownMode ? decodedSlug.slice(0, -3) : decodedSlug;
  const post = await PostService.getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  if (isRawMarkdownMode) {
    const rawMarkdown = await PostService.getRawMarkdownBySlug(slug);

    if (!rawMarkdown) {
      notFound();
    }

    return (
      <div className="raw-source">
        <Link href={blogPostPath(slug)} className="raw-source__back">
          ← Rendered post
        </Link>
        <h1 className="raw-source__title">{post.title}.md</h1>
        <pre>
          <code>{rawMarkdown}</code>
        </pre>
      </div>
    );
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: postDescription(post),
    url: absoluteUrl(blogPostPath(post.slug)),
    mainEntityOfPage: absoluteUrl(blogPostPath(post.slug)),
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "zh-CN",
    author: {
      ...personJsonLd(),
    },
    publisher: {
      ...personJsonLd(),
    },
    articleSection: post.category || undefined,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    timeRequired: post.readingTime ? `PT${post.readingTime}M` : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <PostArticle post={post} />
    </>
  );
}
