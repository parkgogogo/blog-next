import type { Metadata } from "next";
import Link from "next/link";
import { CardHand } from "@/components/digi/CardHand";
import { CardSlashProvider } from "@/components/digi/CardSlash";
import { DigiFooter } from "@/components/digi/DigiFooter";
import { DigiLogo } from "@/components/digi/DigiLogo";
import { EpisodeTitle } from "@/components/digi/EpisodeTitle";
import { HeroScene } from "@/components/digi/HeroScene";
import { ImpmonRunner } from "@/components/digi/ImpmonRunner";
import { NextEpisode } from "@/components/digi/NextEpisode";
import { TamerLicense } from "@/components/digi/TamerLicense";
import { tamerStats } from "@/lib/digi";
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
  const stats = tamerStats(allPosts);
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
            <p className="digi-pop digi-kicker font-hud [animation-delay:0.2s]">
              <span>parkgogogo.me</span>
              <span aria-hidden="true">/</span>
              <span>デジモンテイマーズ</span>
            </p>
            <div className="digi-title digi-pop mt-4 font-display-anime [animation-delay:0.35s]">
              <h1 className="digi-title__main kv-title" data-text="Parkgogogo">
                Parkgogogo
              </h1>
              <p className="digi-title__sub">驯兽师的数码手账</p>
            </div>
            <p className="kv-copy__desc digi-pop [animation-delay:0.55s]">
              Parkgogogo 是 Park 的个人博客，记录前端工程、AI
              编程、产品思考和日常写作。
              <strong className="digi-highlight">今天也在进化中。</strong>
            </p>
            <div className="digi-pop mt-8 flex flex-wrap items-center gap-5 [animation-delay:0.75s]">
              <a href="#episode-cards" className="digi-button">
                <span className="font-hud">CARD SLASH!</span>
                <span>抽一张卡</span>
              </a>
              <Link href="/blog" className="digi-button digi-button--ghost">
                <span className="font-hud">ALL POSTS</span>
              </Link>
            </div>
          </HeroScene>

          <a href="#episode-tamer" className="home-hero__cue font-hud" aria-label="往下看">
            <span>EPISODE 01</span>
            <span aria-hidden="true">▼</span>
          </a>
        </section>

        <section id="episode-tamer" className="home-section" aria-labelledby="tamer-heading">
          <EpisodeTitle no="第1话" title="驯兽师登场" en="ENTER THE TAMER" id="tamer-heading" />
          <TamerLicense stats={stats} />
        </section>

        <section id="episode-cards" className="home-section" aria-labelledby="cards-heading">
          <EpisodeTitle no="第2话" title="抽一张卡吧" en="CARD SLASH" id="cards-heading" />
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
