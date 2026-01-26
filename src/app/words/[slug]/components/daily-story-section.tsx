"use client";

import Link from "next/link";
import type { ILuluWord } from "@/lib/words/types";
import { DailyStory } from "@/app/words/[slug]/components/daily-story";
import { StoryActions } from "@/app/words/[slug]/story/story-actions";

interface DailyStorySectionProps {
  slug: string;
  story: string;
  words: ILuluWord[];
  showBackLink?: boolean;
  showActions?: boolean;
  className?: string;
}

const buildClassName = (base: string, extra?: string) =>
  extra ? `${base} ${extra}` : base;

export const DailyStorySection = ({
  slug,
  story,
  words,
  showBackLink = true,
  showActions = true,
  className,
}: DailyStorySectionProps) => {
  return (
    <div className={buildClassName("story-page", className)}>
      <div className="story-shell max-w-[900px] mx-auto space-y-6">
        <div className="space-y-3">
          <div className="story-kicker">Daily Words Dispatch</div>
          <h1 className="story-headline">{slug} Daily Story</h1>
          {showActions && <StoryActions slug={slug} />}
        </div>

        {story ? (
          <DailyStory story={story} words={words} />
        ) : (
          <div className="text-gray-500">暂无可用单词。</div>
        )}

        {showBackLink && (
          <div className="pt-6">
            <Link className="story-backlink" href={`/words/${slug}`}>
              返回单词页
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
