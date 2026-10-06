import type { Metadata } from "next";
import { DigiFooter } from "@/components/digi/DigiFooter";
import { PostCard } from "@/components/digi/PostCard";
import { postAttribute } from "@/lib/digi";
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

  const sortedPosts = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const counts = sortedPosts.reduce(
    (total, post) => {
      total[postAttribute(post)] += 1;
      return total;
    },
    { vaccine: 0, data: 0, virus: 0 }
  );

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <header className="digi-binder-head">
        <div className="mx-auto max-w-[72rem] px-5 pb-10 pt-12 sm:px-8 sm:pt-16">
          <p className="digi-pop digi-kicker font-hud">
            <span>CARD BINDER</span>
            <span aria-hidden="true">/</span>
            <span>ALL POSTS</span>
          </p>
          <h1 className="digi-section-title digi-section-title--xl digi-pop mt-4 [animation-delay:0.12s]">
            随手记点东西
          </h1>
          <p className="digi-pop mt-4 max-w-[36rem] leading-[1.9] text-[color:var(--text-muted)] [animation-delay:0.24s]">
            每篇文章都是一张数码宝贝卡：属性决定是哪条进化线，阅读时间越长，进化阶段越高。
          </p>
          <dl className="digi-pop digi-binder-stats mt-8 [animation-delay:0.36s]">
            <div>
              <dt>TOTAL</dt>
              <dd>{String(sortedPosts.length).padStart(3, "0")}</dd>
            </div>
            <div data-attribute="vaccine">
              <dt>VACCINE</dt>
              <dd>{String(counts.vaccine).padStart(3, "0")}</dd>
            </div>
            <div data-attribute="data">
              <dt>DATA</dt>
              <dd>{String(counts.data).padStart(3, "0")}</dd>
            </div>
            <div data-attribute="virus">
              <dt>VIRUS</dt>
              <dd>{String(counts.virus).padStart(3, "0")}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-[72rem] px-5 pb-10 pt-4 sm:px-8">
        <div className="digi-card-grid">
          {sortedPosts.map((post, index) => (
            <PostCard key={post.slug} post={post} index={index} />
          ))}
        </div>

        {sortedPosts.length === 0 && (
          <p className="py-16 text-center text-[color:var(--text-muted)]">
            卡组还是空的——数码世界正在加载中……
          </p>
        )}
      </div>

      <DigiFooter />
    </div>
  );
}
