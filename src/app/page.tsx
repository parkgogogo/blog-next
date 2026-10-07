import type { Metadata } from "next";
import Link from "next/link";
import { CardHand } from "@/components/digi/CardHand";
import { CardSlashProvider } from "@/components/digi/CardSlash";
import { COLD_OPEN_GUARD, ColdOpen } from "@/components/digi/ColdOpen";
import { DigiFooter } from "@/components/digi/DigiFooter";
import { DigiLogo } from "@/components/digi/DigiLogo";
import { EpisodeTitle } from "@/components/digi/EpisodeTitle";
import { HeroScene } from "@/components/digi/HeroScene";
import { ImpmonRunner } from "@/components/digi/ImpmonRunner";
import { NextEpisode } from "@/components/digi/NextEpisode";
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

export default async function HomePage() {
  const allPosts = await PostService.getAllPosts();
  const posts = allPosts.slice(0, 7);
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
    <main className="blog-doc-shell design-v2 digi-screen min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      <ColdOpen />
      <script dangerouslySetInnerHTML={{ __html: COLD_OPEN_GUARD }} />

      <CardSlashProvider>
        <section className="home-hero" aria-label="Parkgogogo">
          <header className="home-hero__nav">
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

          <HeroScene>
            <p className="kv-cut font-mono digi-pop [animation-delay:0.2s]">
              C-001 <span aria-hidden="true">／</span> 新宿・屋上{" "}
              <span aria-hidden="true">／</span> parkgogogo.me
            </p>
            <h1 className="kv-title wordmark font-pixel-latin" aria-label="ParkGoGoGo">
              <span className="wordmark__park">Park</span>
              <span className="wordmark__go">GoGoGo</span>
            </h1>
            <p className="kv-tagline digi-pop [animation-delay:0.5s]">驯兽师的数码手账</p>
            <p className="kv-copy__desc digi-pop [animation-delay:0.6s]">
              Parkgogogo 是 Park 的个人博客，记录前端工程、AI
              编程、产品思考和日常写作。<em>今天也在进化中。</em>
            </p>
            <div className="kv-actions digi-pop [animation-delay:0.75s]">
              <a href="#episode-cards" className="v2-btn">
                <span>抽一张卡</span>
                <span className="font-mono">CARD SLASH</span>
              </a>
              <Link href="/blog" className="v2-link">
                全部文章 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </HeroScene>

          <a href="#episode-cards" className="home-hero__cue font-hud" aria-label="往下看">
            <span>EPISODE 01</span>
            <span aria-hidden="true">▼</span>
          </a>
        </section>

        <section id="episode-cards" className="home-section" aria-labelledby="cards-heading">
          <EpisodeTitle no="第1话" title="抽一张卡吧" en="CARD SLASH" id="cards-heading" />
          <CardHand posts={posts} />
          <div className="mt-10 flex justify-center">
            <Link href="/blog" className="digi-chip">
              All cards ▸
            </Link>
          </div>
        </section>

        <section className="home-section home-section--wide" aria-labelledby="runner-heading">
          <EpisodeTitle no="间奏" title="新宿夜跑" en="INTERMISSION · MINI GAME" id="runner-heading" />
          <p className="home-runner__hint">
            按空格 / ↑ 或点一下画面跳跃；吃蓝卡无敌，吃火球自动 Bada Boom。
          </p>
          <div className="home-runner">
            <ImpmonRunner />
          </div>
        </section>

        <NextEpisode />
        <DigiFooter />
      </CardSlashProvider>
    </main>
  );
}
