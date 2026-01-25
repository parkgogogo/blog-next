"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ILuluWord } from "@/lib/words/types";
import {
  generateSpeech,
  getExplanationAction,
  getFreeWordCardAction,
  getWordCardAction,
  translateStoryAction,
} from "@/app/words/[slug]/actions";
import Markdown from "react-markdown";
import {
  WordCardPanel,
  type WordCardMode,
} from "@/app/words/[slug]/components/word-card-panel";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";

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
  open: boolean;
  mode: WordCardMode;
  briefContent?: string;
  detailContent?: string;
  briefLoading?: boolean;
  detailLoading?: boolean;
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

const stripHtml = (text: string) =>
  text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

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
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordMap = useMemo(() => {
    return new Map(words.map((word) => [word.uuid, word]));
  }, [words]);

  const parts = useMemo(() => splitStory(story), [story]);
  const translationParts = useMemo(
    () => (translation ? splitStory(translation) : []),
    [translation],
  );

  const requestBriefCard = async (
    wordText: string,
    word: ILuluWord | undefined,
    options?: { force?: boolean },
  ) => {
    return word
      ? getWordCardAction(word, story, options)
      : getFreeWordCardAction(wordText, story, options);
  };

  const requestDetailCard = async (
    word: ILuluWord,
    options?: { force?: boolean },
  ) => {
    return getExplanationAction(word, options);
  };

  const handleSelect = async (
    wordText: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
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
      open: true,
      mode: "brief",
      briefLoading: true,
      detailLoading: false,
      audioLoading: true,
    });

    try {
      const contentPromise = requestBriefCard(wordText, word);
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
          briefContent: content,
          briefLoading: false,
          audioSrc,
          audioLoading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          briefContent: "生成失败，请重试。",
          briefLoading: false,
          audioLoading: false,
        };
      });
    }
  };

  const closePopover = () => {
    setPopover((current) => {
      if (!current) return current;
      return { ...current, open: false };
    });
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setPopover(null);
      closeTimeoutRef.current = null;
    }, 280);
  };

  const handleRegenerateCard = async () => {
    if (!popover) return;
    const { wordText, word, mode } = popover;
    if (mode === "detail" && !word) return;
    setPopover((current) => {
      if (!current) return current;
      return {
        ...current,
        briefLoading: mode === "brief" ? true : current.briefLoading,
        detailLoading: mode === "detail" ? true : current.detailLoading,
      };
    });

    try {
      if (mode === "detail") {
        if (!word) return;
        const content = await requestDetailCard(word, { force: true });
        setPopover((current) => {
          if (!current || current.wordText !== wordText) return current;
          return {
            ...current,
            detailContent: content,
            detailLoading: false,
          };
        });
        return;
      }
      const content = await requestBriefCard(wordText, word, { force: true });
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          briefContent: content,
          briefLoading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          briefContent: mode === "brief" ? "生成失败，请重试。" : current.briefContent,
          detailContent:
            mode === "detail" ? "生成失败，请重试。" : current.detailContent,
          briefLoading: false,
          detailLoading: false,
        };
      });
    }
  };

  const handleModeChange = async (mode: WordCardMode) => {
    if (!popover) return;
    if (mode === popover.mode) return;
    setPopover((current) => {
      if (!current) return current;
      return { ...current, mode };
    });
    if (mode === "detail" && popover.word && !popover.detailContent) {
      setPopover((current) => {
        if (!current) return current;
        return { ...current, detailLoading: true };
      });
      try {
        const content = await requestDetailCard(popover.word);
        setPopover((current) => {
          if (!current) return current;
          return { ...current, detailContent: content, detailLoading: false };
        });
      } catch {
        setPopover((current) => {
          if (!current) return current;
          return {
            ...current,
            detailContent: "生成失败，请重试。",
            detailLoading: false,
          };
        });
      }
    }
    if (mode === "brief" && !popover.briefContent) {
      setPopover((current) => {
        if (!current) return current;
        return { ...current, briefLoading: true };
      });
      try {
        const content = await requestBriefCard(popover.wordText, popover.word);
        setPopover((current) => {
          if (!current) return current;
          return { ...current, briefContent: content, briefLoading: false };
        });
      } catch {
        setPopover((current) => {
          if (!current) return current;
          return {
            ...current,
            briefContent: "生成失败，请重试。",
            briefLoading: false,
          };
        });
      }
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

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="story-body text-lg whitespace-pre-wrap">
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
                      className="underline decoration-dashed decoration-1 underline-offset-4 text-current decoration-[color:var(--border-subtle)]"
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
              className="story-word story-word--focus"
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
            className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:text-foreground disabled:opacity-50"
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
          <div className="border-t border-dashed border-[color:var(--border-subtle)] pt-4 text-[color:var(--foreground)] whitespace-pre-wrap">
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
          {!popover.isMobile && (
            <button
              type="button"
              aria-label="Close popover"
              onClick={closePopover}
              className="fixed inset-0 z-40 cursor-default story-popover-backdrop"
            />
          )}
          {popover.isMobile ? (
            <>
              <WordCardSheet
                open={popover.open}
                onClose={closePopover}
                wordText={popover.wordText}
                phon={popover.word?.phon}
                contextLine={
                  popover.word?.context.line
                    ? stripHtml(popover.word.context.line)
                    : undefined
                }
                activeMode={popover.mode}
                onModeChange={handleModeChange}
                brief={{
                  label: "简解",
                  content: popover.briefContent,
                  loading: popover.briefLoading,
                  onRegenerate: handleRegenerateCard,
                }}
                detail={{
                  label: "详解",
                  content: popover.detailContent,
                  loading: popover.detailLoading,
                  available: Boolean(popover.word),
                  onRegenerate: handleRegenerateCard,
                }}
                audio={{
                  src: popover.audioSrc,
                  loading: popover.audioLoading,
                  onPlay: handlePlay,
                }}
              />
              {popover.audioSrc && (
                <audio ref={audioRef} src={popover.audioSrc} />
              )}
            </>
          ) : (
            <div
              className="z-50 fixed story-popover-panel"
              style={{
                top: popover.y + 8,
                left: popover.x,
                width: 300,
              }}
            >
              <div className="story-card rounded-2xl p-5 shadow-lg">
                <WordCardPanel
                  wordText={popover.wordText}
                  phon={popover.word?.phon}
                  contextLine={
                    popover.word?.context.line
                      ? stripHtml(popover.word.context.line)
                      : undefined
                  }
                  activeMode={popover.mode}
                  onModeChange={handleModeChange}
                  brief={{
                    label: "简解",
                    content: popover.briefContent,
                    loading: popover.briefLoading,
                    onRegenerate: handleRegenerateCard,
                  }}
                  detail={{
                    label: "详解",
                    content: popover.detailContent,
                    loading: popover.detailLoading,
                    available: Boolean(popover.word),
                    onRegenerate: handleRegenerateCard,
                  }}
                  audio={{
                    src: popover.audioSrc,
                    loading: popover.audioLoading,
                    onPlay: handlePlay,
                  }}
                />
                {popover.audioSrc && (
                  <audio ref={audioRef} src={popover.audioSrc} />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
