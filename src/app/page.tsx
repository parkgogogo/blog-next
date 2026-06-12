import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Logo } from "@/components/Logo";
import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
  blogPostPath,
  postDescription,
  siteConfig,
  siteKeywords,
  siteSameAs,
  websiteJsonLd,
  personJsonLd,
} from "@/lib/seo";

export const revalidate = false;

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: siteKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default async function HomePage() {
  const posts = (await PostService.getAllPosts()).slice(0, 5);
  const profilePageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    inLanguage: "zh-CN",
    mainEntity: personJsonLd(),
  };
  const homeJsonLd = [websiteJsonLd(), profilePageJsonLd];

  return (
    <main className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[72rem] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Parkgogogo home"
            className="flex h-10 items-center text-[color:var(--foreground-strong)]"
          >
            <Logo className="h-8 w-auto text-[color:var(--foreground-strong)]" />
          </Link>

          <nav
            aria-label="Primary"
            className="flex items-center gap-1 text-sm leading-5"
          >
            <Link
              href="/blog"
              className="rounded-full px-3 py-2 font-medium text-[color:var(--foreground-strong)] transition-colors duration-150 hover:bg-[color:var(--surface-tertiary)]"
            >
              Blog
            </Link>
            <a
              href={siteSameAs[0]}
              rel="me noreferrer"
              className="rounded-full px-3 py-2 text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)]"
            >
              GitHub
            </a>
          </nav>
        </header>

        <div className="grid flex-1 content-center gap-12 py-14 md:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] md:items-center md:py-20">
          <section className="max-w-3xl">
            <p className="mb-4 text-sm font-medium leading-5 text-[color:var(--text-muted)]">
              parkgogogo.me
            </p>
            <h1 className="text-[clamp(2.5rem,8vw,5.75rem)] font-semibold leading-[0.95] text-[color:var(--foreground-strong)]">
              Parkgogogo
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[color:var(--text-muted)] sm:text-lg sm:leading-8">
              Parkgogogo 是 Park 的个人博客，记录前端工程、AI 编程、产品思考和日常写作。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="rounded-full bg-[color:var(--foreground-strong)] px-5 py-3 text-sm font-medium leading-5 text-[color:var(--background)] transition-opacity duration-150 hover:opacity-85"
              >
                Read the blog
              </Link>
              <a
                href={siteSameAs[0]}
                rel="me noreferrer"
                className="rounded-full border border-[color:var(--border-default)] px-5 py-3 text-sm font-medium leading-5 text-[color:var(--foreground-strong)] transition-colors duration-150 hover:bg-[color:var(--surface-tertiary)]"
              >
                GitHub profile
              </a>
            </div>
          </section>

          <section aria-labelledby="latest-posts-heading">
            <h2
              id="latest-posts-heading"
              className="text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]"
            >
              Latest posts
            </h2>
            <div className="mt-4 divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
              {posts.map((post) => (
                <article key={post.slug}>
                  <Link
                    href={blogPostPath(post.slug)}
                    className="block py-4 transition-colors duration-150 hover:text-[color:var(--link-primary)]"
                  >
                    <h3 className="text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[color:var(--text-muted)]">
                      {postDescription(post)}
                    </p>
                    <time className="mt-2 block text-xs leading-5 text-[color:var(--text-tertiary)]">
                      {format(new Date(post.date), "d MMM, yyyy")}
                    </time>
                  </Link>
                </article>
              ))}

              {posts.length === 0 && (
                <p className="py-4 text-sm leading-5 text-[color:var(--text-muted)]">
                  Posts will appear here after the blog source is configured.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
