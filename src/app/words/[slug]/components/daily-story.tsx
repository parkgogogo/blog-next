"use client";

import type { MouseEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { ILuluWord } from "@/lib/words/types";
import {
  generateSpeech,
  getFreeWordCardAction,
  getWordCardAction,
  translateStoryAction,
} from "@/app/words/[slug]/actions";
import Markdown from "react-markdown";

interface DailyStoryProps {
  story: string;
  words: ILuluWord[];
}

interface PopoverState {
  wordText: string;
  word?: ILuluWord;
  x: number;
  y: number;
  isMobile: boolean;
  content?: string;
  loading?: boolean;
  audioSrc?: string;
  audioLoading?: boolean;
}

const splitStory = (story: string) => {
  const parts: Array<string | { word: string }> = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(story)) !== null) {
    if (match.index > lastIndex) {
      parts.push(story.slice(lastIndex, match.index));
    }
    parts.push({ word: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < story.length) {
    parts.push(story.slice(lastIndex));
  }

  return parts;
};

const splitEnglishWords = (text: string) => {
  const parts: Array<string | { word: string }> = [];
  const regex = /\b[A-Za-z][A-Za-z'-]*\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ word: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
  "you",
  "your",
]);

export const DailyStory = ({ story, words }: DailyStoryProps) => {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRegeneratingTranslation, setIsRegeneratingTranslation] =
    useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const wordMap = useMemo(() => {
    return new Map(words.map((word) => [word.uuid, word]));
  }, [words]);

  const parts = useMemo(() => splitStory(story), [story]);
  const translationParts = useMemo(
    () => (translation ? splitStory(translation) : []),
    [translation],
  );

  const requestWordCard = async (
    wordText: string,
    word: ILuluWord | undefined,
    options?: { force?: boolean },
  ) => {
    return word
      ? getWordCardAction(word, story, options)
      : getFreeWordCardAction(wordText, story, options);
  };

  const handleSelect = async (
    wordText: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    const word = wordMap.get(wordText);
    const rect = event.currentTarget.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const popoverWidth = 280;
    const margin = 16;
    const rawLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    const clampedLeft = Math.min(
      window.innerWidth - popoverWidth - margin,
      Math.max(margin, rawLeft),
    );
    setPopover({
      wordText,
      word,
      x: clampedLeft,
      y: rect.bottom,
      isMobile,
      loading: true,
      audioLoading: true,
    });

    try {
      const contentPromise = requestWordCard(wordText, word);
      const audioPromise = word
        ? Promise.resolve(`/api/speech/${wordText}`)
        : generateSpeech(wordText).then(
            (base64) => `data:audio/wav;base64,${base64}`,
          );
      const [content, audioSrc] = await Promise.all([
        contentPromise,
        audioPromise,
      ]);
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          content,
          loading: false,
          audioSrc,
          audioLoading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          content: "生成失败，请重试。",
          loading: false,
          audioLoading: false,
        };
      });
    }
  };

  const handleRegenerateCard = async () => {
    if (!popover) return;
    const { wordText, word } = popover;
    setPopover((current) => {
      if (!current) return current;
      return {
        ...current,
        loading: true,
      };
    });

    try {
      const content = await requestWordCard(wordText, word, { force: true });
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          content,
          loading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          content: "生成失败，请重试。",
          loading: false,
        };
      });
    }
  };

  const handlePlay = () => {
    audioRef.current?.play();
  };

  const handleTranslate = async () => {
    if (translation) {
      setShowTranslation((current) => !current);
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translateStoryAction(story);
      setTranslation(result);
      setShowTranslation(true);
    } catch {
      setTranslation("翻译失败，请重试。");
      setShowTranslation(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRegenerateTranslation = async () => {
    setIsRegeneratingTranslation(true);
    try {
      const result = await translateStoryAction(story, { force: true });
      setTranslation(result);
      setShowTranslation(true);
    } catch {
      setTranslation("翻译失败，请重试。");
      setShowTranslation(true);
    } finally {
      setIsRegeneratingTranslation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="story-body text-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (typeof part === "string") {
            const innerParts = splitEnglishWords(part);
            return (
              <span key={`text-${index}`}>
                {innerParts.map((inner, innerIndex) => {
                  if (typeof inner === "string") {
                    return (
                      <span key={`text-${index}-${innerIndex}`}>{inner}</span>
                    );
                  }
                  if (STOP_WORDS.has(inner.word.toLowerCase())) {
                    return (
                      <span key={`stop-${index}-${innerIndex}`}>
                        {inner.word}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={`word-inline-${index}-${innerIndex}-${inner.word}`}
                      type="button"
                      onClick={(event) => handleSelect(inner.word, event)}
                      className="underline decoration-dashed decoration-1 underline-offset-4 text-current decoration-gray-300"
                    >
                      {inner.word}
                    </button>
                  );
                })}
              </span>
            );
          }
          const word = part.word;
          return (
            <button
              key={`word-${index}-${word}`}
              type="button"
              onClick={(event) => handleSelect(word, event)}
              className="story-word story-word--focus underline decoration-2 underline-offset-4 text-orange-600 hover:text-orange-700"
            >
              {word}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="text-xs uppercase tracking-[0.18em] text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {isTranslating
              ? "TRANSLATING..."
              : showTranslation
                ? "HIDE TRANSLATION"
                : "TRANSLATE"}
          </button>
          {translation && (
            <button
              type="button"
              onClick={handleRegenerateTranslation}
              disabled={isRegeneratingTranslation}
              className="text-xs uppercase tracking-[0.18em] text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              {isRegeneratingTranslation ? "GENERATING..." : "REGENERATE"}
            </button>
          )}
        </div>

        {showTranslation && (
          <div className="border-t border-dashed border-gray-300 pt-4 text-gray-700 whitespace-pre-wrap">
            {translationParts.map((part, index) => {
              if (typeof part === "string") {
                return <span key={`t-text-${index}`}>{part}</span>;
              }
              return (
                <span
                  key={`t-word-${index}-${part.word}`}
                  className="story-translation-word"
                >
                  {part.word}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {popover && (
        <>
          <button
            type="button"
            aria-label="Close popover"
            onClick={() => setPopover(null)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            className={`z-50 ${
              popover.isMobile ? "fixed left-4 right-4 bottom-4" : "fixed"
            }`}
            style={
              popover.isMobile
                ? undefined
                : {
                    top: popover.y + 8,
                    left: popover.x,
                    width: 280,
                  }
            }
          >
            <div className="story-card rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between gap-4 items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {popover.wordText}
                  </h3>
                  {popover.word?.phon && (
                    <div
                      className="mt-2 text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: popover.word.phon }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={popover.audioLoading || !popover.audioSrc}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                >
                  {popover.audioLoading ? "生成中…" : "播放发音"}
                </button>
              </div>

              <div className="mt-4 text-gray-800">
                {popover.loading ? (
                  <span className="text-sm text-gray-500">生成中…</span>
                ) : (
                  <Markdown>{popover.content || ""}</Markdown>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRegenerateCard}
                  disabled={popover.loading}
                  className="text-xs uppercase tracking-[0.18em] text-gray-500 hover:text-gray-800 disabled:opacity-50"
                >
                  {popover.loading ? "GENERATING..." : "REGENERATE"}
                </button>
              </div>
              {popover.audioSrc && (
                <audio ref={audioRef} src={popover.audioSrc} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
