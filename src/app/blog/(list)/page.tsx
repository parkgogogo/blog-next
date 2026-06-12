import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { format } from "date-fns";
import { BlogPost, Category } from "@/types/blog";
import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
  blogIndexDescription,
  blogIndexKeywords,
  blogIndexTitle,
  blogPostPath,
  collectCategoryPosts,
  postDescription,
  rssAlternateTypes,
  siteConfig,
  personJsonLd,
} from "@/lib/seo";

export const revalidate = false;

export const metadata: Metadata = {
  title: blogIndexTitle,
  description: blogIndexDescription,
  keywords: blogIndexKeywords,
  alternates: {
    canonical: "/blog",
    types: rssAlternateTypes(),
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title: blogIndexTitle,
    description: blogIndexDescription,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary",
    title: blogIndexTitle,
    description: blogIndexDescription,
  },
};

function getDisplayExcerpt(post: BlogPost): string {
  return postDescription(post);
}

function CategorySection({ category }: { category: Category }) {
  const allPosts = collectCategoryPosts(category);

  if (allPosts.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-[color:var(--border-default)]">
      {allPosts.map((post) => (
        <article key={post.slug} className="group">
          <Link
            href={`/blog/${post.slug}`}
            className="block py-5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--link-primary)]"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold leading-6 text-[color:var(--foreground-strong)] transition-colors duration-150 group-hover:text-[color:var(--link-primary)]">
                {post.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-5 text-[color:var(--text-muted)]">
                {getDisplayExcerpt(post)}
              </p>
              <div className="flex items-center gap-2 text-sm leading-5 text-[color:var(--text-tertiary)]">
                <time>{format(new Date(post.date), "d MMM, yyyy")}</time>
                {post.readingTime !== undefined && post.readingTime > 0 && (
                  <>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function BlogPage() {
  const categories = await PostService.getCategory();
  const allPosts = collectCategoryPosts(categories);
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: blogIndexTitle,
    description: blogIndexDescription,
    url: absoluteUrl("/blog"),
    inLanguage: "zh-CN",
    publisher: {
      ...personJsonLd(),
    },
    blogPost: allPosts.slice(0, 20).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: postDescription(post),
      url: absoluteUrl(blogPostPath(post.slug)),
      datePublished: post.date,
      dateModified: post.date,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 py-4 sm:px-6 md:py-10 lg:px-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <header className="mx-auto mb-1 max-w-3xl">
        <h1 className="sr-only">Blog</h1>
        <div className="blog-subtitle-write mt-3" aria-label="随手记点东西">
          <Image
            src="/blog-subtitle-light.png"
            alt="随手记点东西"
            width={1907}
            height={580}
            priority
            className="blog-subtitle-image blog-subtitle-image--light"
          />
          <Image
            src="/blog-subtitle-dark.png"
            alt=""
            width={1946}
            height={652}
            priority
            className="blog-subtitle-image blog-subtitle-image--dark"
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <CategorySection category={categories} />
      </div>

      {categories.posts.length === 0 &&
        (!categories.subcategories ||
          categories.subcategories.length === 0) && (
          <div className="mx-auto max-w-3xl py-16">
            <div className="max-w-md rounded-[10px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-5">
              <h3 className="text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
                No content found
              </h3>
              <p className="mt-2 text-sm leading-5 text-[color:var(--text-muted)]">
                Get started by creating your first markdown file in your
                repository.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
