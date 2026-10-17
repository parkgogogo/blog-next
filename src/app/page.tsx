import type { Metadata } from "next";
import Image from "next/image";
import PostList from "@/components/PostList";
import { formatShortDate } from "@/lib/format";
import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
  blogPostPath,
  postDescription,
  siteConfig,
  siteKeywords,
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
  const posts = await PostService.getAllPosts();
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
    <div className="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      <section className="home-intro" aria-label="About">
        <div className="home-intro__identity">
          <Image
            src="/avatar.jpg"
            alt=""
            width={44}
            height={44}
            priority
            className="home-intro__avatar"
          />
          <h1>{siteConfig.author.displayName}</h1>
        </div>
        <div className="home-intro__bio">
          {siteConfig.bio.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <PostList
        posts={posts.map((post) => ({
          slug: post.slug,
          href: blogPostPath(post.slug),
          title: post.title,
          excerpt: post.subtitle || postDescription(post),
          category: post.category,
          date: post.date,
          dateLabel: formatShortDate(post.date),
        }))}
      />
    </div>
  );
}
