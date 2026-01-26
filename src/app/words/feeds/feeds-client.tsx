"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ILuluWord } from "@/lib/words/types";
import { DailyWordsSection } from "@/app/words/[slug]/components/daily-words-section";
import { DailyStorySection } from "@/app/words/[slug]/components/daily-story-section";

interface FeedItem {
  slug: string;
  words: ILuluWord[];
  story: string;
}

interface FeedsClientProps {
  initialItems: FeedItem[];
}

export const FeedsClient = ({ initialItems }: FeedsClientProps) => {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const shownSlugs = useMemo(() => items.map((item) => item.slug), [items]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("exclude", shownSlugs.slice(-3).join(","));
      const response = await fetch(`/api/words/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setHasMore(false);
        return;
      }
      const data = (await response.json()) as FeedItem | null;
      if (!data) {
        setHasMore(false);
        return;
      }
      setItems((prev) => [...prev, data]);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, shownSlugs]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="feeds-page">
      <div className="feed-track">
        {items.length === 0 && (
          <div className="feed-empty">暂无可用单词。</div>
        )}
        {items.map(({ slug, words, story }, index) => (
          <div className="feed-slice" key={`${slug}-${index}`}>
            <section className="feed-item feed-item--words">
              <DailyWordsSection
                slug={slug}
                words={words}
                showStoryLink={false}
                className="feed-panel"
              />
            </section>
            <section className="feed-item feed-item--story">
              <DailyStorySection
                slug={slug}
                story={story}
                words={words}
                showBackLink={false}
                showActions={false}
                className="feed-panel feed-panel--story"
              />
            </section>
          </div>
        ))}
        {hasMore && (
          <div className="feed-sentinel" ref={sentinelRef}>
            {loading ? "加载中..." : "继续滑动加载下一天"}
          </div>
        )}
      </div>
    </div>
  );
};
