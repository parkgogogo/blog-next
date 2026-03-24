"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Volume2 } from "lucide-react";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";
import { streamSseText } from "@/lib/ai/streaming";
import {
  completeDailyTaskAction,
  recordMemoryEventAction,
} from "@/app/words/daily/actions";
import {
  enqueuePendingMemoryEvent,
  flushPendingMemoryEvents,
  type DailyMemoryEventPayload,
} from "@/lib/memory/pending-events";
import { MemoryAudioPreloader } from "@/lib/audio/memory-audio-preloader";
import { streamDailyWordCard } from "@/lib/words/card-sse-client";

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
  initialCompleted: boolean;
  cards: DailyTaskCard[];
  wordContexts: Record<string, WordContext>;
}

type BundleCache = Record<
  string,
  {
    brief: string;
    detail: string;
    contextLines: string[];
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

const getSentenceAudioSrc = (card: DailyTaskCard | undefined, date: string) => {
  if (!card?.speechToken) return undefined;
  const params = new URLSearchParams({
    cardId: card.id,
    date,
    token: card.speechToken,
  });
  return `/api/speech/sentence?${params.toString()}`;
};

export const DailyTaskClient = ({
  date,
  initialCompleted,
  cards,
  wordContexts,
}: DailyTaskClientProps) => {
  const SENTENCE_AUDIO_LOADING_TIMEOUT_MS = 15000;
  const storageKey = `daily-task-state:${date}`;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"initial" | "review">("initial");
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewCursor, setReviewCursor] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(initialCompleted);
  const [reviewing, setReviewing] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [loopNotice, setLoopNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWordId, setSheetWordId] = useState<string | null>(null);
  const [sheetWordText, setSheetWordText] = useState("");
  const [sheetContextLines, setSheetContextLines] = useState<string[]>([]);
  const [sheetContextLoading, setSheetContextLoading] = useState(false);
  const [sheetMode, setSheetMode] = useState<"brief" | "detail">("brief");
  const [sheetBrief, setSheetBrief] = useState("");
  const [sheetDetail, setSheetDetail] = useState("");
  const [sheetBriefLoading, setSheetBriefLoading] = useState(false);
  const [sheetDetailLoading, setSheetDetailLoading] = useState(false);
  const [sentenceAudioStatus, setSentenceAudioStatus] = useState<
    "idle" | "loading" | "playing"
  >("idle");
  const [sentenceTranslationOpen, setSentenceTranslationOpen] = useState(false);
  const [sentenceTranslation, setSentenceTranslation] = useState("");
  const [sentenceTranslationLoading, setSentenceTranslationLoading] =
    useState(false);
  const sentenceAudioRef = useRef<HTMLAudioElement>(null);
  const sheetAudioRef = useRef<HTMLAudioElement>(null);
  const audioPreloaderRef = useRef<MemoryAudioPreloader | null>(null);
  const sentenceAudioLoadingTimerRef = useRef<number | null>(null);
  const sentencePlaybackRequestIdRef = useRef(0);
  const sheetAudioPlaybackRequestIdRef = useRef(0);
  const bundleCacheRef = useRef<BundleCache>({});
  const wordCardPreloadInFlightRef = useRef<
    Partial<Record<string, Promise<void>>>
  >({});
  const sentenceTranslationCacheRef = useRef<Record<string, string>>({});
  const sentenceTranslationPreloadInFlightRef = useRef<
    Partial<Record<string, Promise<void>>>
  >({});
  const sentenceTranslationControllerRef = useRef<AbortController | null>(null);
  const sentenceTranslationRequestIdRef = useRef(0);
  const pendingReviewRef = useRef<Set<string>>(new Set());
  const masteredCardsRef = useRef<Set<string>>(new Set());
  const currentVisitOpenedRef = useRef(false);
  const pendingSentenceAutoPlayRef = useRef(false);
  const autoPlayRetryOnGestureRef = useRef(false);
  const sentencePlayRequestedRef = useRef(false);
  const navLockRef = useRef(false);
  const sheetRequestIdRef = useRef(0);
  const [pendingVersion, setPendingVersion] = useState(0);
  const [masteredVersion, setMasteredVersion] = useState(0);
  const [, setAudioCacheVersion] = useState(0);
  const confettiPieces = useMemo(() => buildConfetti(), []);
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const cardIndexById = useMemo(() => {
    return new Map(cards.map((entry, idx) => [entry.id, idx]));
  }, [cards]);
  const currentCardIndex =
    phase === "initial"
      ? index
      : (cardIndexById.get(reviewQueue[reviewCursor] ?? "") ?? 0);
  const card = cards[currentCardIndex];
  const totalCards = cards.length;
  const { masteredCount, learningCount, unmasteredCount } = (() => {
    if (totalCards === 0) {
      return {
        masteredCount: 0,
        learningCount: 0,
        unmasteredCount: 0,
      };
    }

    if (completed) {
      return {
        masteredCount: totalCards,
        learningCount: 0,
        unmasteredCount: 0,
      };
    }

    const validCardIds = new Set(cards.map((entry) => entry.id));
    const masteredIds = new Set(
      Array.from(masteredCardsRef.current).filter((cardId) =>
        validCardIds.has(cardId),
      ),
    );
    const learningIds = new Set<string>();

    pendingReviewRef.current.forEach((cardId) => {
      if (!validCardIds.has(cardId) || masteredIds.has(cardId)) return;
      learningIds.add(cardId);
    });
    reviewQueue.forEach((cardId) => {
      if (!validCardIds.has(cardId) || masteredIds.has(cardId)) return;
      learningIds.add(cardId);
    });

    const resolvedMasteredCount = Math.min(totalCards, masteredIds.size);
    const resolvedLearningCount = Math.min(
      totalCards - resolvedMasteredCount,
      learningIds.size,
    );

    return {
      masteredCount: resolvedMasteredCount,
      learningCount: resolvedLearningCount,
      unmasteredCount: Math.max(
        0,
        totalCards - resolvedMasteredCount - resolvedLearningCount,
      ),
    };
  })();
  const masteredPercent =
    totalCards > 0 ? Math.min(100, (masteredCount / totalCards) * 100) : 0;
  const learningPercent =
    totalCards > 0 ? Math.min(100, (learningCount / totalCards) * 100) : 0;
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
    return getSentenceAudioSrc(card, date);
  }, [card, date]);

  const sheetAudioSrc = sheetWordText
    ? (audioPreloaderRef.current?.getPlayableSrc(`/api/speech/${sheetWordText}`) ??
      `/api/speech/${sheetWordText}`)
    : undefined;

  const taskAudioSrcList = useMemo(() => {
    const sentenceSrcList = cards
      .map((taskCard) => getSentenceAudioSrc(taskCard, date))
      .filter((src): src is string => Boolean(src));
    const uniqueWordText = new Set<string>();
    cards.forEach((taskCard) => {
      taskCard.words.forEach((wordText) => {
        if (!wordText) return;
        uniqueWordText.add(wordText);
      });
    });
    const wordSrcList = Array.from(uniqueWordText).map(
      (wordText) => `/api/speech/${wordText}`,
    );
    return [...sentenceSrcList, ...wordSrcList];
  }, [cards, date]);

  useEffect(() => {
    let cancelled = false;
    const preloader = new MemoryAudioPreloader({
      concurrency: 3,
      onReady: () => {
        if (cancelled) return;
        setAudioCacheVersion((value) => value + 1);
      },
    });
    const previous = audioPreloaderRef.current;
    previous?.dispose();
    audioPreloaderRef.current = preloader;
    preloader.registerMany(taskAudioSrcList);
    setAudioCacheVersion((value) => value + 1);

    const runPreload = () => {
      void preloader.preloadMany(taskAudioSrcList);
    };

    const handle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(runPreload)
        : window.setTimeout(runPreload, 120);

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as number);
      }
      if (audioPreloaderRef.current === preloader) {
        audioPreloaderRef.current = null;
      }
      preloader.dispose();
    };
  }, [taskAudioSrcList]);

  const playSentenceAudio = useCallback(
    async (src?: string, options?: { waitForPreload?: boolean }) => {
      if (!src || !sentenceAudioRef.current) return;
      if (sentenceAudioStatus !== "idle") return;
      const shouldWaitForPreload = options?.waitForPreload ?? true;
      const requestId = sentencePlaybackRequestIdRef.current + 1;
      sentencePlaybackRequestIdRef.current = requestId;
      if (sentenceAudioLoadingTimerRef.current !== null) {
        window.clearTimeout(sentenceAudioLoadingTimerRef.current);
        sentenceAudioLoadingTimerRef.current = null;
      }
      setSentenceAudioStatus("loading");
      let resolvedSrc: string | undefined;
      if (shouldWaitForPreload) {
        resolvedSrc =
          (await audioPreloaderRef.current?.resolveForPlayback(src)) ?? src;
      } else {
        resolvedSrc = audioPreloaderRef.current?.getPlayableSrc(src) ?? src;
      }
      if (sentencePlaybackRequestIdRef.current !== requestId) return;
      if (!sentenceAudioRef.current) {
        setSentenceAudioStatus("idle");
        return;
      }
      sentencePlayRequestedRef.current = true;
      sentenceAudioLoadingTimerRef.current = window.setTimeout(() => {
        sentencePlayRequestedRef.current = false;
        setSentenceAudioStatus("idle");
      }, SENTENCE_AUDIO_LOADING_TIMEOUT_MS);
      sentenceAudioRef.current.src = resolvedSrc;
      const playResult = sentenceAudioRef.current.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch((error: unknown) => {
          if (
            options?.waitForPreload === false &&
            error instanceof DOMException &&
            error.name === "NotAllowedError"
          ) {
            autoPlayRetryOnGestureRef.current = true;
          }
          if (sentenceAudioLoadingTimerRef.current !== null) {
            window.clearTimeout(sentenceAudioLoadingTimerRef.current);
            sentenceAudioLoadingTimerRef.current = null;
          }
          sentencePlayRequestedRef.current = false;
          setSentenceAudioStatus("idle");
        });
      }
    },
    [SENTENCE_AUDIO_LOADING_TIMEOUT_MS, sentenceAudioStatus],
  );

  useEffect(() => {
    currentVisitOpenedRef.current = false;
    pendingSentenceAutoPlayRef.current = true;
    autoPlayRetryOnGestureRef.current = false;
    sentencePlaybackRequestIdRef.current += 1;
    if (sentenceAudioLoadingTimerRef.current !== null) {
      window.clearTimeout(sentenceAudioLoadingTimerRef.current);
      sentenceAudioLoadingTimerRef.current = null;
    }
    sentencePlayRequestedRef.current = false;
    setSentenceAudioStatus("idle");
    setSentenceTranslationOpen(false);
    setSentenceTranslationLoading(false);
    setSentenceTranslation("");
    sentenceTranslationControllerRef.current?.abort();
    sentenceTranslationControllerRef.current = null;
    sentenceTranslationRequestIdRef.current += 1;
  }, [currentCardIndex, phase]);

  useEffect(() => {
    return () => {
      if (sentenceAudioLoadingTimerRef.current !== null) {
        window.clearTimeout(sentenceAudioLoadingTimerRef.current);
      }
      sentenceTranslationControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!sentenceAudioSrc) return;
    if (!pendingSentenceAutoPlayRef.current) return;
    if (sentenceAudioStatus !== "idle") return;
    pendingSentenceAutoPlayRef.current = false;
    void playSentenceAudio(sentenceAudioSrc, { waitForPreload: false });
  }, [sentenceAudioSrc, sentenceAudioStatus, playSentenceAudio]);

  useEffect(() => {
    const retryOnGesture = () => {
      if (!autoPlayRetryOnGestureRef.current) return;
      if (!sentenceAudioSrc) return;
      if (sentenceAudioStatus !== "idle") return;
      autoPlayRetryOnGestureRef.current = false;
      void playSentenceAudio(sentenceAudioSrc, { waitForPreload: false });
    };

    window.addEventListener("pointerdown", retryOnGesture, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", retryOnGesture);
    };
  }, [playSentenceAudio, sentenceAudioSrc, sentenceAudioStatus]);

  useEffect(() => {
    flushPendingEvents();
  }, []);

  useEffect(() => {
    if (totalCards === 0) return;
    const raw = sessionStorage.getItem(storageKey);
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
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
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
    const resolvedPayload = {
      ...payload,
      timezone: payload.timezone ?? timezone,
    };
    try {
      await recordMemoryEventAction(resolvedPayload);
    } catch {
      enqueuePendingMemoryEvent(resolvedPayload);
    }
  };

  const flushPendingEvents = () => {
    void flushPendingMemoryEvents(recordMemoryEventAction);
  };

  const processCard = (cardIndex: number, openedThisVisit: boolean) => {
    const target = cards[cardIndex];
    if (!target) return;

    void Promise.all(
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
      if (cardId && !masteredCardsRef.current.has(cardId)) {
        masteredCardsRef.current.add(cardId);
        setMasteredVersion((value) => value + 1);
      }
      void Promise.all(
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
    processCard(cardIndex, openedThisVisit);
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

  const prefetchWordData = useCallback(
    (wordId: string, wordText: string) => {
      if (!wordId || !wordText) return;
      const audioSrc = `/api/speech/${wordText}`;
      audioPreloaderRef.current?.register(audioSrc);
      void audioPreloaderRef.current?.preload(audioSrc).catch(() => undefined);
    },
    [],
  );

  const getFallbackContextLines = useCallback(
    (wordId: string, wordText: string) => {
      const contextLines =
        wordContexts[wordId]?.contextLines?.map((line) => line.trim()) ?? [];
      const cleanedContextLines = contextLines.filter(Boolean);
      return cleanedContextLines.length > 0 ? cleanedContextLines : [wordText];
    },
    [wordContexts],
  );

  const preloadWordCardBundle = useCallback(
    (wordId: string, wordText: string) => {
      if (!wordId || !wordText) return;
      if (bundleCacheRef.current[wordId]) return;
      if (wordCardPreloadInFlightRef.current[wordId]) return;

      let briefText = "";
      let detailText = "";
      let resolvedContextLines = getFallbackContextLines(wordId, wordText);

      const applyMetaContextLines = (
        meta: { primaryContext?: string; historyContexts?: string[] } | null,
      ) => {
        const merged = [meta?.primaryContext, ...(meta?.historyContexts ?? [])].filter(
          (line): line is string =>
            typeof line === "string" && line.trim().length > 0,
        );
        if (merged.length > 0) {
          resolvedContextLines = merged;
        }
      };

      const request = Promise.all([
        streamDailyWordCard({
          wordId,
          mode: "brief",
          onDelta: (delta) => {
            briefText += delta;
          },
        }),
        streamDailyWordCard({
          wordId,
          mode: "detail",
          onDelta: (delta) => {
            detailText += delta;
          },
        }),
      ])
        .then(([briefResult, detailResult]) => {
          briefText = briefResult.content || briefText || "暂无内容";
          detailText = detailResult.content || detailText || "暂无内容";
          applyMetaContextLines(briefResult.meta);
          applyMetaContextLines(detailResult.meta);
          bundleCacheRef.current[wordId] = {
            brief: briefText,
            detail: detailText,
            contextLines: resolvedContextLines,
          };
        })
        .catch(() => undefined)
        .finally(() => {
          delete wordCardPreloadInFlightRef.current[wordId];
        });

      wordCardPreloadInFlightRef.current[wordId] = request;
    },
    [getFallbackContextLines],
  );

  const preloadSentenceTranslation = useCallback((targetCard: DailyTaskCard) => {
    const cardId = targetCard.id;
    if (!cardId) return;
    if (sentenceTranslationCacheRef.current[cardId]) return;
    if (sentenceTranslationPreloadInFlightRef.current[cardId]) return;

    const request = (async () => {
      const response = await fetch("/api/words/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: targetCard.sentence }),
      });
      if (!response.ok) {
        throw new Error(`Translation preload failed: ${response.status}`);
      }
      const payload = (await response.json()) as { content?: unknown };
      const content =
        typeof payload.content === "string" ? payload.content.trim() : "";
      if (content) {
        sentenceTranslationCacheRef.current[cardId] = content;
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        delete sentenceTranslationPreloadInFlightRef.current[cardId];
      });

    sentenceTranslationPreloadInFlightRef.current[cardId] = request;
  }, []);

  useEffect(() => {
    if (!card) return;
    const handle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => {
            card.word_ids.forEach((wordId, index) => {
              const wordText = card.words[index] || "";
              prefetchWordData(wordId, wordText);
              preloadWordCardBundle(wordId, wordText);
            });
          })
        : window.setTimeout(() => {
            card.word_ids.forEach((wordId, index) => {
              const wordText = card.words[index] || "";
              prefetchWordData(wordId, wordText);
              preloadWordCardBundle(wordId, wordText);
            });
          }, 100);

    return () => {
      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [card, prefetchWordData, preloadWordCardBundle]);

  useEffect(() => {
    if (!card) return;
    const handle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => {
            preloadSentenceTranslation(card);
          })
        : window.setTimeout(() => {
            preloadSentenceTranslation(card);
          }, 120);

    return () => {
      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [card, preloadSentenceTranslation]);

  const handleOpenSheet = (wordId: string, wordText: string) => {
    if (isProcessing) return;
    flushPendingEvents();
    markWordOpened(currentCardIndex);
    setSheetOpen(true);
    setSheetWordId(wordId);
    setSheetWordText(wordText);
    const requestId = sheetRequestIdRef.current + 1;
    sheetRequestIdRef.current = requestId;

    if (sheetAudioRef.current) {
      const nextAudioSrc = `/api/speech/${wordText}`;
      const playbackRequestId = sheetAudioPlaybackRequestIdRef.current + 1;
      sheetAudioPlaybackRequestIdRef.current = playbackRequestId;
      void (async () => {
        const resolvedAudioSrc =
          (await audioPreloaderRef.current?.resolveForPlayback(nextAudioSrc)) ??
          nextAudioSrc;
        if (sheetAudioPlaybackRequestIdRef.current !== playbackRequestId) return;
        if (!sheetAudioRef.current) return;
        sheetAudioRef.current.src = resolvedAudioSrc;
        const playResult = sheetAudioRef.current.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(() => undefined);
        }
      })();
    }

    const fallbackContextLines = getFallbackContextLines(wordId, wordText);
    setSheetContextLines(fallbackContextLines);
    setSheetContextLoading(false);
    setSheetMode("brief");
    setSheetBrief("");
    setSheetDetail("");
    setSheetBriefLoading(true);
    setSheetDetailLoading(true);

    void reportMemoryEvent({
      wordId,
      eventType: "open_card",
      meta: { source: "daily_task", date },
    });

    const cached = bundleCacheRef.current[wordId];
    if (cached) {
      setSheetBrief(cached.brief);
      setSheetDetail(cached.detail);
      if (cached.contextLines.length > 0) {
        setSheetContextLines(cached.contextLines);
      }
      setSheetBriefLoading(false);
      setSheetDetailLoading(false);
      return;
    }

    let streamedBrief = "";
    let streamedDetail = "";
    let resolvedContextLines = fallbackContextLines;

    const applyMetaContextLines = (
      meta: { primaryContext?: string; historyContexts?: string[] } | null,
    ) => {
      const merged = [meta?.primaryContext, ...(meta?.historyContexts ?? [])].filter(
        (line): line is string => typeof line === "string" && line.trim().length > 0,
      );
      if (merged.length > 0) {
        resolvedContextLines = merged;
        if (sheetRequestIdRef.current === requestId) {
          setSheetContextLines(merged);
        }
      }
    };

    const syncBundleCache = () => {
      bundleCacheRef.current[wordId] = {
        brief: streamedBrief || "暂无内容",
        detail: streamedDetail || "暂无内容",
        contextLines: resolvedContextLines,
      };
    };

    void streamDailyWordCard({
      wordId,
      mode: "brief",
      onDelta: (delta) => {
        streamedBrief += delta;
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetBriefLoading(false);
        setSheetBrief(streamedBrief);
      },
    })
      .then((result) => {
        streamedBrief = result.content || streamedBrief || "暂无内容";
        applyMetaContextLines(result.meta);
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetBrief(streamedBrief);
      })
      .catch(() => {
        streamedBrief = "请求失败";
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetBrief(streamedBrief);
      })
      .finally(() => {
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetBriefLoading(false);
        syncBundleCache();
      });

    void streamDailyWordCard({
      wordId,
      mode: "detail",
      onDelta: (delta) => {
        streamedDetail += delta;
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetDetailLoading(false);
        setSheetDetail(streamedDetail);
      },
    })
      .then((result) => {
        streamedDetail = result.content || streamedDetail || "暂无内容";
        applyMetaContextLines(result.meta);
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetDetail(streamedDetail);
      })
      .catch(() => {
        streamedDetail = "请求失败";
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetDetail(streamedDetail);
      })
      .finally(() => {
        if (sheetRequestIdRef.current !== requestId) return;
        setSheetDetailLoading(false);
        syncBundleCache();
      });
  };

  const handleCloseSheet = () => {
    sheetAudioPlaybackRequestIdRef.current += 1;
    if (sheetAudioRef.current) {
      sheetAudioRef.current.pause();
    }
    setSheetOpen(false);
  };

  const handlePlaySentence = () => {
    void playSentenceAudio(sentenceAudioSrc);
  };

  const streamSentenceTranslation = async (
    sentence: string,
    requestId: number,
  ) => {
    sentenceTranslationControllerRef.current?.abort();
    const controller = new AbortController();
    sentenceTranslationControllerRef.current = controller;
    const response = await fetch("/api/words/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: sentence, stream: true }),
      signal: controller.signal,
    });
    let assembled = "";
    let doneText = "";
    const streamed = await streamSseText({
      response,
      onDelta: (delta) => {
        assembled += delta;
        if (sentenceTranslationRequestIdRef.current === requestId) {
          setSentenceTranslation(assembled);
        }
      },
      onEvent: ({ event, data }) => {
        if (event !== "done") return;
        try {
          const payload = JSON.parse(data) as { text?: unknown };
          if (typeof payload.text === "string") {
            doneText = payload.text;
          }
        } catch {
          // Ignore non-JSON done payload.
        }
      },
    });
    return doneText.trim() || streamed.trim();
  };

  const handleToggleSentenceTranslation = async () => {
    if (!card) return;
    const cached = sentenceTranslationCacheRef.current[card.id];
    if (sentenceTranslationOpen) {
      sentenceTranslationControllerRef.current?.abort();
      sentenceTranslationControllerRef.current = null;
      sentenceTranslationRequestIdRef.current += 1;
      setSentenceTranslationOpen(false);
      setSentenceTranslationLoading(false);
      return;
    }
    if (cached) {
      setSentenceTranslation(cached);
      setSentenceTranslationOpen(true);
      return;
    }

    const requestId = sentenceTranslationRequestIdRef.current + 1;
    sentenceTranslationRequestIdRef.current = requestId;
    setSentenceTranslationOpen(true);
    setSentenceTranslation("");
    setSentenceTranslationLoading(true);

    const preloadInFlight = sentenceTranslationPreloadInFlightRef.current[card.id];
    if (preloadInFlight) {
      await preloadInFlight;
      if (sentenceTranslationRequestIdRef.current !== requestId) return;
      const preloaded = sentenceTranslationCacheRef.current[card.id];
      if (preloaded) {
        setSentenceTranslation(preloaded);
        setSentenceTranslationLoading(false);
        return;
      }
    }

    try {
      const translation = await streamSentenceTranslation(
        card.sentence,
        requestId,
      );
      if (sentenceTranslationRequestIdRef.current !== requestId) return;
      const safeTranslation = translation?.trim() || "暂无翻译。";
      sentenceTranslationCacheRef.current[card.id] = safeTranslation;
      setSentenceTranslation(safeTranslation);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error(error);
      if (sentenceTranslationRequestIdRef.current === requestId) {
        setSentenceTranslation("翻译失败，请稍后再试。");
      }
    } finally {
      if (sentenceTranslationRequestIdRef.current === requestId) {
        setSentenceTranslationLoading(false);
      }
    }
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
      <div
        className="daily-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={masteredCount + learningCount}
        aria-valuetext={`已背 ${masteredCount}，学习中 ${learningCount}，未背 ${unmasteredCount}`}
      >
        <div
          className="daily-progress-bar daily-progress-bar--mastered"
          style={{
            width: `${masteredPercent}%`,
          }}
        />
        {learningPercent > 0 && (
          <div
            className="daily-progress-bar daily-progress-bar--learning"
            style={{
              left: `${masteredPercent}%`,
              width: `${learningPercent}%`,
            }}
          />
        )}
        <div className="daily-progress-text" aria-hidden>
          已背 {masteredCount} · 学习中 {learningCount} · 未背 {unmasteredCount}
        </div>
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
            <div className="daily-sentence-controls">
              <button
                type="button"
                onClick={handlePlaySentence}
                disabled={!sentenceAudioSrc || sentenceAudioStatus !== "idle"}
                className="daily-sentence-audio"
                aria-label="朗读句子"
              >
                <Volume2 size={16} />
                {sentenceAudioStatus === "loading" && (
                  <span className="daily-sentence-audio-label">LOADING</span>
                )}
                {sentenceAudioStatus === "playing" && (
                  <span className="daily-sentence-audio-label">PLAYING</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleToggleSentenceTranslation}
                className={buildClassName(
                  "daily-sentence-translate",
                  sentenceTranslationOpen ? "daily-sentence-translate--active" : "",
                )}
                aria-expanded={sentenceTranslationOpen}
                aria-label="查看句子翻译"
              >
                <Languages size={16} />
                <span className="daily-sentence-audio-label">
                  {sentenceTranslationLoading ? "LOADING" : "翻译"}
                </span>
              </button>
            </div>
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
            {sentenceTranslationOpen && (
              <div
                className="daily-sentence-translation daily-sentence-anim"
                aria-live="polite"
              >
                {sentenceTranslation ||
                  (sentenceTranslationLoading ? "翻译中..." : "")}
              </div>
            )}
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
        contextLines={sheetContextLines.map((line) => ({ line }))}
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
          src: sheetAudioSrc,
          onPlay: () => undefined,
        }}
      />
      <audio ref={sheetAudioRef} />
      {sentenceAudioSrc && (
        <audio
          ref={sentenceAudioRef}
          onLoadStart={() => {
            if (!sentencePlayRequestedRef.current) return;
            setSentenceAudioStatus("loading");
          }}
          onWaiting={() => {
            if (!sentencePlayRequestedRef.current) return;
            setSentenceAudioStatus("loading");
          }}
          onPlaying={() => {
            if (sentenceAudioLoadingTimerRef.current !== null) {
              window.clearTimeout(sentenceAudioLoadingTimerRef.current);
              sentenceAudioLoadingTimerRef.current = null;
            }
            setSentenceAudioStatus("playing");
          }}
          onEnded={() => {
            if (sentenceAudioLoadingTimerRef.current !== null) {
              window.clearTimeout(sentenceAudioLoadingTimerRef.current);
              sentenceAudioLoadingTimerRef.current = null;
            }
            sentencePlayRequestedRef.current = false;
            setSentenceAudioStatus("idle");
          }}
          onPause={() => {
            if (sentenceAudioLoadingTimerRef.current !== null) {
              window.clearTimeout(sentenceAudioLoadingTimerRef.current);
              sentenceAudioLoadingTimerRef.current = null;
            }
            sentencePlayRequestedRef.current = false;
            setSentenceAudioStatus("idle");
          }}
          onError={() => {
            if (sentenceAudioLoadingTimerRef.current !== null) {
              window.clearTimeout(sentenceAudioLoadingTimerRef.current);
              sentenceAudioLoadingTimerRef.current = null;
            }
            sentencePlayRequestedRef.current = false;
            setSentenceAudioStatus("idle");
          }}
        />
      )}
    </div>
  );
};
