"use client";

import Link from "next/link";
import type { ILuluWord } from "@/lib/words/types";
import { ContextLine } from "@/app/words/[slug]/components/context-line";
import { Index } from "@/app/words/[slug]/components/word";

interface DailyWordsSectionProps {
  slug: string;
  words: ILuluWord[];
  showStoryLink?: boolean;
  showNextLink?: boolean;
  nextSlug?: string | null;
  className?: string;
  title?: string;
}

const buildClassName = (base: string, extra?: string) =>
  extra ? `${base} ${extra}` : base;

export const DailyWordsSection = ({
  slug,
  words,
  showStoryLink = true,
  showNextLink = false,
  nextSlug,
  className,
  title,
}: DailyWordsSectionProps) => {
  return (
    <div className={buildClassName("words-section", className)}>
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-medium font-display text-foreground leading-tight tracking-tight mt-0">
            {title ?? `${slug} Daily Words`}
          </h1>
          {showStoryLink && (
            <Link
              className="text-sm text-orange-500 hover:text-orange-600 underline underline-offset-4"
              href={`/words/${slug}/story`}
            >
              今日短文
            </Link>
          )}
        </div>
        <div className="markdown-body">
          {words.map((word) => (
            <div key={word.uuid}>
              <Index
                text={word.uuid}
                phon={word.phon}
                sourceLink={word.sourceLink}
              />
              <ContextLine word={word} />
            </div>
          ))}
        </div>
        {showNextLink && nextSlug && (
          <div className="mt-12 text-lg text-orange-400 font-semibold underline">
            <Link
              href={`/words/${nextSlug}`}
            >{`> Next: ${nextSlug} Daily words`}</Link>
          </div>
        )}
      </div>
    </div>
  );
};
