"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ILuluWord } from "@/lib/words/types";
import {
  generateSpeech,
  translatePassageAction,
} from "@/app/words/[slug]/actions";
import {
  WordCardPanel,
  type WordCardMode,
} from "@/app/words/[slug]/components/word-card-panel";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";
import { streamPluginWordCard } from "@/lib/words/card-sse-client";

interface DailyStoryProps {
  story: string;
  words: ILuluWord[];
}

interface PopoverState {
  wordText: string;
  word?: ILuluWord;
  contextLine?: string;
  contextLoading?: boolean;
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

const resolveSourceSentence = (story: string, wordText: string) => {
  const plainStory = stripHtml(story.replace(/\[\[([^\]]+)\]\]/g, "$1"));
  const escapedWord = wordText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordPattern = new RegExp(`\\b${escapedWord}\\b`, "i");
  const sentenceCandidates = (plainStory.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const matched = sentenceCandidates.find((sentence) => wordPattern.test(sentence));

  if (matched) return matched;
  if (wordPattern.test(plainStory)) return plainStory;
  return wordText;
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

const MAX_CONTEXT_LENGTH = 160;

export const DailyStory = ({ story, words }: DailyStoryProps) => {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRegeneratingTranslation, setIsRegeneratingTranslation] =
    useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordMap = useMemo(() => {
    return new Map(words.map((word) => [word.uuid, word]));
  }, [words]);

  const parts = useMemo(() => splitStory(story), [story]);
  const translationParts = useMemo(
    () => (translation ? splitStory(translation) : []),
    [translation],
  );

  const requestBundle = async (
    wordText: string,
    options?: {
      force?: boolean;
      onBriefDelta?: (delta: string) => void;
      onDetailDelta?: (delta: string) => void;
    },
  ) => {
    const sourceSentence = resolveSourceSentence(story, wordText);
    const [briefResult, detailResult] = await Promise.all([
      streamPluginWordCard({
        word: wordText,
        sourceSentence,
        mode: "brief",
        force: options?.force,
        maxChars: MAX_CONTEXT_LENGTH,
        onDelta: options?.onBriefDelta,
      }),
      streamPluginWordCard({
        word: wordText,
        sourceSentence,
        mode: "detail",
        force: options?.force,
        maxChars: MAX_CONTEXT_LENGTH,
        onDelta: options?.onDetailDelta,
      }),
    ]);

    return {
      context: briefResult.meta?.primaryContext || sourceSentence,
      brief: briefResult.content || "暂无内容",
      detail: detailResult.content || "暂无内容",
    };
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
      detailLoading: true,
      audioLoading: true,
      contextLine: "",
      contextLoading: true,
    });

    try {
      let briefText = "";
      let detailText = "";
      const contentPromise = requestBundle(wordText, {
        onBriefDelta: (delta) => {
          briefText += delta;
          setPopover((current) => {
            if (!current || current.wordText !== wordText) return current;
            return {
              ...current,
              briefLoading: false,
              briefContent: briefText,
            };
          });
        },
        onDetailDelta: (delta) => {
          detailText += delta;
          setPopover((current) => {
            if (!current || current.wordText !== wordText) return current;
            return {
              ...current,
              detailLoading: false,
              detailContent: detailText,
            };
          });
        },
      });
      const audioPromise = word
        ? Promise.resolve(`/api/speech/${wordText}`)
        : generateSpeech(wordText).then(
            (base64) => `data:audio/wav;base64,${base64}`,
          );
      const [bundle, audioSrc] = await Promise.all([
        contentPromise,
        audioPromise,
      ]);
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          contextLine: bundle.context,
          contextLoading: false,
          briefContent: bundle.brief,
          detailContent: bundle.detail,
          briefLoading: false,
          detailLoading: false,
          audioSrc,
          audioLoading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          contextLoading: false,
          ...current,
          briefContent: "生成失败，请重试。",
          detailContent: "生成失败，请重试。",
          briefLoading: false,
          detailLoading: false,
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
    const { wordText } = popover;
    setPopover((current) => {
      if (!current) return current;
      return {
        ...current,
        briefLoading: true,
        detailLoading: true,
        contextLoading: true,
      };
    });

    try {
      let briefText = "";
      let detailText = "";
      const bundle = await requestBundle(wordText, {
        force: true,
        onBriefDelta: (delta) => {
          briefText += delta;
          setPopover((current) => {
            if (!current || current.wordText !== wordText) return current;
            return {
              ...current,
              briefLoading: false,
              briefContent: briefText,
            };
          });
        },
        onDetailDelta: (delta) => {
          detailText += delta;
          setPopover((current) => {
            if (!current || current.wordText !== wordText) return current;
            return {
              ...current,
              detailLoading: false,
              detailContent: detailText,
            };
          });
        },
      });
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          ...current,
          contextLine: bundle.context,
          contextLoading: false,
          briefContent: bundle.brief,
          detailContent: bundle.detail,
          briefLoading: false,
          detailLoading: false,
        };
      });
    } catch {
      setPopover((current) => {
        if (!current || current.wordText !== wordText) return current;
        return {
          contextLoading: false,
          ...current,
          briefContent: "生成失败，请重试。",
          detailContent: "生成失败，请重试。",
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
  };

  const handleTranslate = async () => {
    if (translation) {
      setShowTranslation((current) => !current);
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translatePassageAction(story);
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
      const result = await translatePassageAction(story, { force: true });
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
      <div className="story-body text-base whitespace-pre-wrap">
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
                  popover.contextLine
                    ? stripHtml(popover.contextLine)
                    : undefined
                }
                contextLoading={popover.contextLoading}
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
                  available: Boolean(popover.contextLine),
                  onRegenerate: handleRegenerateCard,
                }}
                audio={{
                  src: popover.audioSrc,
                  loading: popover.audioLoading,
                }}
              />
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
              <div className="story-card word-card-popover rounded-2xl p-5">
                <WordCardPanel
                  wordText={popover.wordText}
                  phon={popover.word?.phon}
                  contextLine={
                    popover.contextLine
                      ? stripHtml(popover.contextLine)
                      : undefined
                  }
                  contextLoading={popover.contextLoading}
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
                    available: Boolean(popover.contextLine),
                    onRegenerate: handleRegenerateCard,
                  }}
                  audio={{
                    src: popover.audioSrc,
                    loading: popover.audioLoading,
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
