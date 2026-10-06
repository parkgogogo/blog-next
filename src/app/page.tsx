import type { Metadata } from "next";
import Link from "next/link";
import { CardSlashProvider } from "@/components/digi/CardSlash";
import { DigiFooter } from "@/components/digi/DigiFooter";
import { DigiLogo } from "@/components/digi/DigiLogo";
import { DigitalField } from "@/components/digi/DigitalField";
import { ImpmonRunner } from "@/components/digi/ImpmonRunner";
import { HeroPartner } from "@/components/digi/HeroPartner";
import { PostCard } from "@/components/digi/PostCard";
import { PostService } from "@/lib/posts";
import {
  absoluteUrl,
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

const BOOT_LINES = [
  "> HYPNOS MONITOR ...... ONLINE",
  "> SCANNING SHINJUKU ... OK",
  "> DIGITAL FIELD DETECTED ▲",
];

export default async function HomePage() {
  const posts = (await PostService.getAllPosts()).slice(0, 6);
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
    <main className="blog-doc-shell digi-screen min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      <CardSlashProvider>
      <section className="digi-hero relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <DigitalField />

        <header className="relative z-20 mx-auto flex w-full max-w-[78rem] items-center justify-between px-5 pt-6 sm:px-8">
          <DigiLogo />
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-3">
            <Link href="/blog" className="digi-chip">
              Blog
            </Link>
            <a href={siteSameAs[0]} rel="me noreferrer" className="digi-chip">
              GitHub
            </a>
          </nav>
        </header>

        <div className="digi-hero-content relative z-10 mx-auto grid w-full max-w-[78rem] flex-1 items-center gap-6 px-5 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="relative z-10 max-w-[36rem]">
            <div className="digi-boot font-pixel-term" aria-hidden="true">
              {BOOT_LINES.map((line, index) => (
                <p
                  key={line}
                  className="digi-boot__line"
                  style={{ animationDelay: `${0.2 + index * 0.45}s` }}
                >
                  {line}
                </p>
              ))}
            </div>

            <p className="digi-pop digi-kicker font-hud mt-7 [animation-delay:1.3s]">
              <span>parkgogogo.me</span>
              <span aria-hidden="true">/</span>
              <span>デジモンテイマーズ</span>
            </p>
            <div className="digi-title digi-pop mt-4 font-display-anime [animation-delay:1.45s]">
              <h1 className="digi-title__main" data-text="Parkgogogo">
                Parkgogogo
              </h1>
              <p className="digi-title__sub">驯兽师的数码手账</p>
            </div>
            <p className="digi-pop mt-6 max-w-[30rem] text-[1.04rem] leading-[1.95] text-[color:var(--foreground)] [animation-delay:1.65s]">
              Parkgogogo 是 Park 的个人博客，记录前端工程、AI
              编程、产品思考和日常写作。
              <strong className="digi-highlight">今天也在进化中。</strong>
            </p>
            <div className="digi-pop mt-9 flex flex-wrap items-center gap-5 [animation-delay:1.85s]">
              <Link href="/blog" className="digi-button">
                <span className="font-hud">CARD SLASH!</span>
                <span>读文章</span>
              </Link>
              <a
                href={siteSameAs[0]}
                rel="me noreferrer"
                className="digi-button digi-button--ghost"
              >
                <span className="font-hud">GITHUB</span>
              </a>
            </div>
          </div>

          <HeroPartner />
        </div>

        <ImpmonRunner />

      </section>

      <section
        id="cards"
        aria-labelledby="cards-heading"
        className="relative mx-auto w-full max-w-[78rem] scroll-mt-8 px-5 pb-16 pt-20 sm:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="digi-kicker font-hud">
              <span>CARD DECK</span>
              <span aria-hidden="true">/</span>
              <span>{String(posts.length).padStart(2, "0")} CARDS</span>
            </p>
            <h2 id="cards-heading" className="digi-section-title mt-3">
              最新卡组
            </h2>
          </div>
          <Link href="/blog" className="digi-chip">
            All cards ▸
          </Link>
        </div>

        <div className="digi-card-grid mt-10">
          {posts.map((post, index) => (
            <PostCard key={post.slug} post={post} index={index} />
          ))}
        </div>

        {posts.length === 0 && (
          <p className="mt-10 text-[color:var(--text-muted)]">
            卡组还是空的——数码世界正在加载中……
          </p>
        )}
      </section>

      <DigiFooter />
      </CardSlashProvider>
    </main>
  );
}
