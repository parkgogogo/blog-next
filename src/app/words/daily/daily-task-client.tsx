"use client";

import { useMemo, useRef, useState } from "react";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";
import {
  completeDailyTaskAction,
  getDailyWordBundleAction,
  recordMemoryEventAction,
} from "@/app/words/daily/actions";

type DailyTaskCard = {
  id: string;
  sentence: string;
  word_ids: string[];
  words: string[];
  word_count: number;
  char_count: number;
};

type WordContext = {
  id: string;
  text: string;
  contextLine: string;
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
      parts.push({ type: "text", value: sentence.slice(lastIndex, match.index) });
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
  const [index, setIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWordId, setSheetWordId] = useState<string | null>(null);
  const [sheetWordText, setSheetWordText] = useState("");
  const [sheetContextLine, setSheetContextLine] = useState("");
  const [sheetMode, setSheetMode] = useState<"brief" | "detail">("brief");
  const [sheetBrief, setSheetBrief] = useState("");
  const [sheetDetail, setSheetDetail] = useState("");
  const [sheetBriefLoading, setSheetBriefLoading] = useState(false);
  const [sheetDetailLoading, setSheetDetailLoading] = useState(false);
  const bundleCacheRef = useRef<BundleCache>({});
  const openedByCardRef = useRef<Map<number, Set<string>>>(new Map());
  const processedCardsRef = useRef<Set<number>>(new Set());
  const confettiPieces = useMemo(() => buildConfetti(), []);

  const card = cards[index];
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

  const markWordOpened = (cardIndex: number, wordId: string) => {
    const opened = openedByCardRef.current.get(cardIndex) ?? new Set();
    opened.add(wordId);
    openedByCardRef.current.set(cardIndex, opened);
  };

  const processCard = async (cardIndex: number) => {
    if (processedCardsRef.current.has(cardIndex)) return;
    const target = cards[cardIndex];
    if (!target) return;
    processedCardsRef.current.add(cardIndex);
    const opened = openedByCardRef.current.get(cardIndex) ?? new Set();

    await Promise.all(
      target.word_ids.map((wordId) =>
        recordMemoryEventAction({
          wordId,
          eventType: "exposure",
          meta: { source: "daily_task", date },
        }),
      ),
    );

    const knownIds = target.word_ids.filter((wordId) => !opened.has(wordId));
    if (knownIds.length > 0) {
      await Promise.all(
        knownIds.map((wordId) =>
          recordMemoryEventAction({
            wordId,
            eventType: "mark_known",
            meta: { source: "daily_task", date },
          }),
        ),
      );
    }
  };

  const handlePrev = () => {
    if (index === 0 || isProcessing) return;
    setIndex((current) => Math.max(0, current - 1));
  };

  const handleNext = async () => {
    if (!card || isProcessing || isLast) return;
    setIsProcessing(true);
    try {
      await processCard(index);
      setIndex((current) => Math.min(totalCards - 1, current + 1));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!card || isProcessing) return;
    setIsProcessing(true);
    try {
      await processCard(index);
      await completeDailyTaskAction(date);
      setCompleted(true);
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 2200);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenSheet = async (wordId: string, wordText: string) => {
    if (isProcessing) return;
    markWordOpened(index, wordId);
    setSheetOpen(true);
    setSheetWordId(wordId);
    setSheetWordText(wordText);
    const contextLine = wordContexts[wordId]?.contextLine?.trim() || wordText;
    setSheetContextLine(contextLine);
    setSheetMode("brief");
    setSheetBriefLoading(true);
    setSheetDetailLoading(true);

    await recordMemoryEventAction({
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
      return;
    }

    try {
      const bundle = await getDailyWordBundleAction({
        word: wordText,
        sourceText: contextLine,
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
              disabled={index === 0 || isProcessing}
              className="daily-button"
            >
              上一张
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isProcessing}
                className="daily-button daily-button--primary"
              >
                下一张
              </button>
            )}
            {isLast && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isProcessing || completed}
                className="daily-button daily-button--primary"
              >
                {completed ? "已完成" : "完成今日任务"}
              </button>
            )}
          </div>
          {completed && (
            <div className="daily-complete">Nice! 今日任务完成。</div>
          )}
        </div>
        <div className="daily-dots" aria-hidden>
          {Array.from({ length: totalCards }).map((_, dotIndex) => (
            <span
              key={`dot-${dotIndex}`}
              className={buildClassName(
                "daily-dot",
                dotIndex === index ? "daily-dot--active" : "",
              )}
            />
          ))}
        </div>
      </div>

      <WordCardSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        wordText={sheetWordText}
        contextLine={sheetContextLine}
        contextLoading={sheetBriefLoading || sheetDetailLoading}
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
          src: sheetWordText ? `/api/speech/${sheetWordText}` : undefined,
          onPlay: () => undefined,
        }}
      />
    </div>
  );
};
