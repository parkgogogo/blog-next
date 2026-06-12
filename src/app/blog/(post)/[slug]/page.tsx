import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
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
    keywords: post.tags?.length
      ? [...post.tags, post.category, siteConfig.author.name, "博客"]
      : [post.category, siteConfig.author.name, "博客"],
    category: post.category,
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
      <div className="mx-auto w-full max-w-[72rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <article className="max-w-3xl bg-transparent">
          <header className="mb-6 md:mb-8">
            <Link
              href={`/blog/${slug}`}
              className="mb-3 inline-flex text-sm leading-5 text-[color:var(--link-primary)] transition-colors duration-150 hover:text-[color:var(--link-primary-hover)]"
            >
              Rendered post
            </Link>
            <h1 className="mb-2 break-words text-[30px] font-semibold leading-[42px] text-[color:var(--foreground-strong)]">
              {post.title}.md
            </h1>
            <p className="text-sm leading-5 text-[color:var(--text-muted)]">
              Raw Markdown Source
            </p>
          </header>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4 font-mono text-sm leading-6 text-[color:var(--foreground)] md:p-5">
            <code>{rawMarkdown}</code>
          </pre>
        </article>
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
    articleSection: post.category,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    timeRequired: post.readingTime ? `PT${post.readingTime}M` : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="max-w-3xl bg-transparent">
        <div className="px-0 py-0">
          <header className="mb-4">
            <h1 className="mb-3 break-words text-[30px] font-semibold leading-[42px] text-[color:var(--foreground-strong)]">
              {post.title}
            </h1>

            <div className="flex flex-row items-center gap-2 text-sm leading-5 text-[color:var(--text-muted)]">
              <time>{format(new Date(post.date), "d MMM, yyyy")}</time>
              {post.readingTime !== undefined && post.readingTime > 0 && (
                <>
                  <span>·</span>
                  <span>{post.readingTime} min read</span>
                </>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-xs font-medium leading-[18px] text-[color:var(--text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="mt-0">
            <MarkdownRenderer content={post.content} />
          </div>
        </div>
      </article>
    </div>
  );
}
