"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";
import {
  completeDailyTaskAction,
  getDailyWordBundleAction,
  recordMemoryEventAction,
  translateContextLinesAction,
} from "@/app/words/daily/actions";
import {
  enqueuePendingMemoryEvent,
  flushPendingMemoryEvents,
  type DailyMemoryEventPayload,
} from "@/lib/memory/pending-events";

type DailyTaskCard = {
  id: string;
  sentence: string;
  word_ids: string[];
  words: string[];
  word_count: number;
  char_count: number;
  speechToken?: string | null;
};

type WordContext = {
  id: string;
  text: string;
  contextLines: string[];
};

interface DailyTaskClientProps {
  date: string;
  cards: DailyTaskCard[];
  wordContexts: Record<string, WordContext>;
}

type BundleCache = Record<
  string,
  {
    brief: string;
    detail: string;
  }
>;

type SentencePart =
  | { type: "text"; value: string }
  | { type: "word"; value: string; wordId: string };

const buildClassName = (base: string, extra?: string) =>
  extra ? `${base} ${extra}` : base;

const splitSentence = (sentence: string, wordMap: Map<string, string>) => {
  const parts: SentencePart[] = [];
  const regex = /\b[A-Za-z][A-Za-z'-]*\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: sentence.slice(lastIndex, match.index),
      });
    }
    const raw = match[0];
    const normalized = raw.toLowerCase();
    const wordId = wordMap.get(normalized);
    if (wordId) {
      parts.push({ type: "word", value: raw, wordId });
    } else {
      parts.push({ type: "text", value: raw });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < sentence.length) {
    parts.push({ type: "text", value: sentence.slice(lastIndex) });
  }

  return parts;
};

const buildConfetti = () =>
  Array.from({ length: 28 }).map((_, index) => ({
    id: index,
    left: `${(index * 7) % 100}%`,
    delay: `${(index % 7) * 0.08}s`,
    duration: `${1.4 + (index % 5) * 0.15}s`,
    hue: (index * 29) % 360,
  }));

export const DailyTaskClient = ({
  date,
  cards,
  wordContexts,
}: DailyTaskClientProps) => {
  const storageKey = `daily-task-state:${date}`;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"initial" | "review">("initial");
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewCursor, setReviewCursor] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [loopNotice, setLoopNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWordId, setSheetWordId] = useState<string | null>(null);
  const [sheetWordText, setSheetWordText] = useState("");
  const [sheetContextLines, setSheetContextLines] = useState<string[]>([]);
  const [sheetContextTranslations, setSheetContextTranslations] = useState<
    string[]
  >([]);
  const [sheetContextLoading, setSheetContextLoading] = useState(false);
  const [sheetMode, setSheetMode] = useState<"brief" | "detail">("brief");
  const [sheetBrief, setSheetBrief] = useState("");
  const [sheetDetail, setSheetDetail] = useState("");
  const [sheetBriefLoading, setSheetBriefLoading] = useState(false);
  const [sheetDetailLoading, setSheetDetailLoading] = useState(false);
  const sentenceAudioRef = useRef<HTMLAudioElement>(null);
  const bundleCacheRef = useRef<BundleCache>({});
  const contextCacheRef = useRef<
    Record<string, { linesKey: string; translations: string[] }>
  >({});
  const pendingReviewRef = useRef<Set<string>>(new Set());
  const masteredCardsRef = useRef<Set<string>>(new Set());
  const currentVisitOpenedRef = useRef(false);
  const navLockRef = useRef(false);
  const [pendingVersion, setPendingVersion] = useState(0);
  const [masteredVersion, setMasteredVersion] = useState(0);
  const confettiPieces = useMemo(() => buildConfetti(), []);

  const cardIndexById = useMemo(() => {
    return new Map(cards.map((entry, idx) => [entry.id, idx]));
  }, [cards]);
  const currentCardIndex =
    phase === "initial"
      ? index
      : (cardIndexById.get(reviewQueue[reviewCursor] ?? "") ?? 0);
  const card = cards[currentCardIndex];
  const totalCards = cards.length;
  const isLast = index === totalCards - 1;
  const wordMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!card) return map;
    card.words.forEach((word, i) => {
      const id = card.word_ids[i];
      if (!word || !id) return;
      map.set(word.toLowerCase(), id);
    });
    return map;
  }, [card]);

  const sentenceParts = useMemo(() => {
    if (!card) return [];
    return splitSentence(card.sentence, wordMap);
  }, [card, wordMap]);
  const sentenceAudioSrc = useMemo(() => {
    if (!card?.speechToken) return undefined;
    const params = new URLSearchParams({
      cardId: card.id,
      date,
      token: card.speechToken,
    });
    return `/api/speech/sentence?${params.toString()}`;
  }, [card, date]);

  useEffect(() => {
    currentVisitOpenedRef.current = false;
  }, [currentCardIndex, phase]);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    flushPendingEvents();
  }, []);

  useEffect(() => {
    const prefix = "daily-task-state:";
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || key === storageKey || !key.startsWith(prefix)) continue;
      localStorage.removeItem(key);
    }
  }, [storageKey]);

  useEffect(() => {
    if (totalCards === 0) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        index?: number;
        phase?: "initial" | "review";
        reviewQueue?: string[];
        reviewCursor?: number;
        pendingReview?: string[];
        masteredCards?: string[];
        loopCount?: number;
        completed?: boolean;
      };
      const validCardIds = new Set(cards.map((entry) => entry.id));
      const storedIndex = typeof parsed.index === "number" ? parsed.index : 0;
      const nextIndex = Math.min(Math.max(0, storedIndex), totalCards - 1);
      const nextPhase = parsed.phase === "review" ? "review" : "initial";
      const nextQueue = (parsed.reviewQueue ?? []).filter((cardId) =>
        validCardIds.has(cardId),
      );
      const nextCursor =
        typeof parsed.reviewCursor === "number"
          ? Math.min(Math.max(0, parsed.reviewCursor), nextQueue.length - 1)
          : 0;
      const pendingReview = (parsed.pendingReview ?? []).filter((cardId) =>
        validCardIds.has(cardId),
      );
      const masteredCards = (parsed.masteredCards ?? []).filter((cardId) =>
        validCardIds.has(cardId),
      );

      setIndex(nextIndex);
      setPhase(nextPhase);
      setReviewQueue(nextQueue);
      setReviewCursor(nextCursor);
      pendingReviewRef.current = new Set(pendingReview);
      setPendingVersion((value) => value + 1);
      masteredCardsRef.current = new Set(masteredCards);
      setMasteredVersion((value) => value + 1);
      if (typeof parsed.loopCount === "number") {
        setLoopCount(Math.max(0, parsed.loopCount));
      }
      if (parsed.completed) {
        setCompleted(true);
      }
    } catch {
      // Ignore corrupted storage.
    }
  }, [cards, storageKey, totalCards]);

  useEffect(() => {
    if (totalCards === 0) return;
    const payload = {
      index,
      phase,
      reviewQueue,
      reviewCursor,
      pendingReview: Array.from(pendingReviewRef.current),
      masteredCards: Array.from(masteredCardsRef.current),
      loopCount,
      completed,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    index,
    phase,
    reviewQueue,
    reviewCursor,
    loopCount,
    pendingVersion,
    masteredVersion,
    completed,
    storageKey,
    totalCards,
  ]);

  const markWordOpened = (cardIndex: number) => {
    const cardId = cards[cardIndex]?.id;
    if (cardId) {
      if (phase === "initial") {
        pendingReviewRef.current.add(cardId);
        setPendingVersion((value) => value + 1);
      }
    }
    currentVisitOpenedRef.current = true;
  };

  const reportMemoryEvent = async (payload: DailyMemoryEventPayload) => {
    try {
      await recordMemoryEventAction(payload);
    } catch {
      enqueuePendingMemoryEvent(payload);
    }
  };

  const flushPendingEvents = () => {
    void flushPendingMemoryEvents(recordMemoryEventAction);
  };

  const processCard = async (cardIndex: number, openedThisVisit: boolean) => {
    const target = cards[cardIndex];
    if (!target) return;

    await Promise.all(
      target.word_ids.map((wordId) =>
        reportMemoryEvent({
          wordId,
          eventType: "exposure",
          meta: { source: "daily_task", date },
        }),
      ),
    );

    if (!openedThisVisit) {
      const cardId = target.id;
      if (cardId) {
        masteredCardsRef.current.add(cardId);
        setMasteredVersion((value) => value + 1);
      }
      await Promise.all(
        target.word_ids.map((wordId) =>
          reportMemoryEvent({
            wordId,
            eventType: "mark_known",
            meta: { source: "daily_task", date },
          }),
        ),
      );
    }
  };

  const reportCard = (cardIndex: number, openedThisVisit: boolean) => {
    flushPendingEvents();
    void processCard(cardIndex, openedThisVisit).catch(() => undefined);
  };

  const acquireNavLock = () => {
    if (navLockRef.current) return false;
    navLockRef.current = true;
    setIsProcessing(true);
    queueMicrotask(() => {
      navLockRef.current = false;
      setIsProcessing(false);
    });
    return true;
  };

  const handlePrev = () => {
    if (phase === "review" || index === 0 || isProcessing) return;
    if (!acquireNavLock()) return;
    setIndex((current) => Math.max(0, current - 1));
  };

  const handleNext = async () => {
    if (!card || isProcessing) return;
    if (!acquireNavLock()) return;
    const openedThisVisit = currentVisitOpenedRef.current;
    if (phase === "initial") {
      if (isLast) return;
      reportCard(currentCardIndex, openedThisVisit);
      setIndex((current) => Math.min(totalCards - 1, current + 1));
      setLoopNotice(null);
    } else {
      reportCard(currentCardIndex, openedThisVisit);
      const currentId = reviewQueue[reviewCursor];
      let updatedQueue = reviewQueue;
      if (openedThisVisit && currentId) {
        updatedQueue = [
          ...reviewQueue.filter(
            (id, idx) => idx !== reviewCursor && id !== currentId,
          ),
          currentId,
        ];
      } else {
        updatedQueue = reviewQueue.filter((_, idx) => idx !== reviewCursor);
      }
      if (updatedQueue.length === 0) {
        void completeDailyTaskAction(date).catch(() => undefined);
        setCompleted(true);
        setReviewing(false);
        setConfettiActive(true);
        setLoopNotice(null);
        setTimeout(() => setConfettiActive(false), 2200);
        currentVisitOpenedRef.current = false;
        return;
      }
      const nextCursor = Math.min(reviewCursor, updatedQueue.length - 1);
      setReviewQueue(updatedQueue);
      setReviewCursor(nextCursor);
    }
    currentVisitOpenedRef.current = false;
  };

  const handleComplete = async () => {
    if (!card || isProcessing) return;
    if (!acquireNavLock()) return;
    const openedThisVisit = currentVisitOpenedRef.current;
    if (phase === "initial") {
      reportCard(currentCardIndex, openedThisVisit);
      if (pendingReviewRef.current.size > 0) {
        const reviewList = cards
          .map((entry) => entry.id)
          .filter((cardId) => pendingReviewRef.current.has(cardId));
        pendingReviewRef.current.clear();
        setPendingVersion((value) => value + 1);
        setLoopCount((count) => count + 1);
        setPhase("review");
        setReviewQueue(reviewList);
        setReviewCursor(0);
        setLoopNotice("还有没掌握的词，再来一轮");
        currentVisitOpenedRef.current = false;
        return;
      }
      void completeDailyTaskAction(date).catch(() => undefined);
      setCompleted(true);
      setReviewing(false);
      setConfettiActive(true);
      setLoopNotice(null);
      setTimeout(() => setConfettiActive(false), 2200);
    }
    currentVisitOpenedRef.current = false;
  };

  const handleStartReview = () => {
    if (cards.length === 0) return;
    setReviewing(true);
    setPhase("initial");
    setIndex(0);
    setLoopNotice(null);
  };

  const handleOpenSheet = async (wordId: string, wordText: string) => {
    if (isProcessing) return;
    flushPendingEvents();
    markWordOpened(currentCardIndex);
    setSheetOpen(true);
    setSheetWordId(wordId);
    setSheetWordText(wordText);
    const contextLines =
      wordContexts[wordId]?.contextLines?.map((line) => line.trim()) ?? [];
    const cleanedContextLines = contextLines.filter(Boolean);
    setSheetContextLines(cleanedContextLines);
    setSheetContextTranslations([]);
    setSheetContextLoading(cleanedContextLines.length > 0);
    setSheetMode("brief");
    setSheetBriefLoading(true);
    setSheetDetailLoading(true);

    await reportMemoryEvent({
      wordId,
      eventType: "open_card",
      meta: { source: "daily_task", date },
    });

    const cached = bundleCacheRef.current[wordId];
    if (cached) {
      setSheetBrief(cached.brief);
      setSheetDetail(cached.detail);
      setSheetBriefLoading(false);
      setSheetDetailLoading(false);
    }

    const primaryContextLine =
      cleanedContextLines[0]?.trim() || wordText;

    const contextCache = contextCacheRef.current[wordId];
    const linesKey = cleanedContextLines.join("\n");
    if (contextCache && contextCache.linesKey === linesKey) {
      setSheetContextTranslations(contextCache.translations);
      setSheetContextLoading(false);
    } else if (cleanedContextLines.length > 0) {
      try {
        const translations = await translateContextLinesAction({
          lines: cleanedContextLines,
        });
        contextCacheRef.current[wordId] = {
          linesKey,
          translations,
        };
        setSheetContextTranslations(translations);
      } catch {
        setSheetContextTranslations([]);
      } finally {
        setSheetContextLoading(false);
      }
    } else {
      setSheetContextLoading(false);
    }

    if (cached) return;

    try {
      const bundle = await getDailyWordBundleAction({
        word: wordText,
        sourceText: primaryContextLine,
      });
      bundleCacheRef.current[wordId] = {
        brief: bundle.brief ?? "",
        detail: bundle.detail ?? "",
      };
      setSheetBrief(bundle.brief ?? "");
      setSheetDetail(bundle.detail ?? "");
    } catch {
      setSheetBrief("请求失败");
      setSheetDetail("请求失败");
    } finally {
      setSheetBriefLoading(false);
      setSheetDetailLoading(false);
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
  };

  const handlePlaySentence = () => {
    if (!sentenceAudioSrc || !sentenceAudioRef.current) return;
    sentenceAudioRef.current.src = sentenceAudioSrc;
    sentenceAudioRef.current.play();
  };

  if (!card) {
    return (
      <div className="daily-page">
        <div className="daily-shell">
          <div className="daily-sentence">暂无今日任务。</div>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-page">
      <div className="daily-progress">
        <div
          className="daily-progress-bar"
          style={{
            width:
              totalCards > 0
                ? `${Math.min(
                    100,
                    (completed
                      ? totalCards
                      : masteredCardsRef.current.size) /
                      totalCards *
                      100,
                  )}%`
                : "0%",
          }}
        />
      </div>
      <div className="daily-date">{date}</div>
      {confettiActive && (
        <div className="daily-confetti" aria-hidden>
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                backgroundColor: `hsl(${piece.hue}deg 80% 58%)`,
              }}
            />
          ))}
        </div>
      )}
      <div className="daily-shell">
        <div className="daily-core">
          <div className="daily-sentence-wrap">
            <button
              type="button"
              onClick={handlePlaySentence}
              disabled={!sentenceAudioSrc}
              className="daily-sentence-audio"
              aria-label="朗读句子"
            >
              <Volume2 size={16} />
            </button>
            <div key={card.id} className="daily-sentence daily-sentence-anim">
              {sentenceParts.map((part, idx) =>
                part.type === "text" ? (
                  <span key={`${card.id}-text-${idx}`}>{part.value}</span>
                ) : (
                  <button
                    key={`${card.id}-word-${idx}`}
                    type="button"
                    onClick={() =>
                      handleOpenSheet(
                        part.wordId,
                        wordContexts[part.wordId]?.text || part.value,
                      )
                    }
                    className={buildClassName(
                      "daily-word",
                      sheetOpen && sheetWordId === part.wordId
                        ? "daily-word--active"
                        : "",
                    )}
                  >
                    {part.value}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="daily-actions">
            <button
              type="button"
              onClick={handlePrev}
              disabled={
                (!reviewing && completed) ||
                phase === "review" ||
                index === 0 ||
                isProcessing
              }
              className="daily-button"
            >
              上一张
            </button>
            {phase === "initial" && !isLast && (
              <button
                type="button"
                onClick={handleNext}
                disabled={(!reviewing && completed) || isProcessing}
                className="daily-button daily-button--primary"
              >
                下一张
              </button>
            )}
            {phase === "initial" && isLast && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isProcessing || (!reviewing && completed)}
                className="daily-button daily-button--primary"
              >
                {completed && !reviewing ? "已完成" : "下一张"}
              </button>
            )}
            {phase === "review" && (
              <button
                type="button"
                onClick={handleNext}
                disabled={(!reviewing && completed) || isProcessing}
                className="daily-button daily-button--primary"
              >
                下一张
              </button>
            )}
          </div>
          {loopNotice && <div className="daily-loop-notice">{loopNotice}</div>}
          {completed && (
            <div className="daily-complete">Nice! 今日任务完成。</div>
          )}
          {completed && !reviewing && (
            <div className="daily-actions">
              <button
                type="button"
                onClick={handleStartReview}
                className="daily-button daily-button--primary"
              >
                复习今日任务
              </button>
            </div>
          )}
        </div>
      </div>

      <WordCardSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        wordText={sheetWordText}
        contextLines={sheetContextLines.map((line, index) => ({
          line,
          translation: sheetContextTranslations[index],
        }))}
        contextLoading={sheetContextLoading}
        activeMode={sheetMode}
        onModeChange={setSheetMode}
        brief={{
          label: "简解",
          content: sheetBrief,
          loading: sheetBriefLoading,
        }}
        detail={{
          label: "详解",
          content: sheetDetail,
          loading: sheetDetailLoading,
        }}
        audio={{
          src: sheetWordId ? `/api/speech/${sheetWordId}` : undefined,
          onPlay: () => undefined,
        }}
        autoPlayOnOpen
      />
      {sentenceAudioSrc && <audio ref={sentenceAudioRef} />}
    </div>
  );
};
