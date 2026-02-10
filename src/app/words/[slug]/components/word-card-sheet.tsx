"use client";

import { useCallback, useEffect, useRef } from "react";
import { Volume2, X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";
import { type WordCardMode } from "@/app/words/[slug]/components/word-card-panel";
import { WordCardMarkdown } from "@/app/words/[slug]/components/word-card-markdown";

const tabBaseClass =
  "px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] rounded-full transition";

interface WordCardSheetProps {
  open: boolean;
  onClose: () => void;
  wordText: string;
  phon?: string;
  contextLine?: string;
  contextLines?: Array<{ line: string; translation?: string }>;
  contextLoading?: boolean;
  activeMode: WordCardMode;
  onModeChange: (mode: WordCardMode) => void;
  brief: {
    label: string;
    content?: string;
    loading?: boolean;
    available?: boolean;
    onRegenerate?: () => void;
  };
  detail: {
    label: string;
    content?: string;
    loading?: boolean;
    available?: boolean;
    onRegenerate?: () => void;
  };
  audio?: {
    src?: string;
    loading?: boolean;
    onPlay?: () => void;
  };
  autoPlayOnOpen?: boolean;
}

export const WordCardSheet = ({
  open,
  onClose,
  wordText,
  phon,
  activeMode,
  onModeChange,
  brief,
  detail,
  audio,
  autoPlayOnOpen = false,
}: WordCardSheetProps) => {
  const activeContent = activeMode === "brief" ? brief : detail;
  const briefAvailable = brief.available ?? true;
  const detailAvailable = detail.available ?? true;
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastPlayAtRef = useRef(0);
  const resolvedAudioSrc = audio?.src;
  const canPlayAudio = Boolean(resolvedAudioSrc);
  const previousOpenRef = useRef(open);

  const handlePlay = useCallback(() => {
    if (!canPlayAudio) return;
    const now = Date.now();
    if (now - lastPlayAtRef.current < 800) return;
    lastPlayAtRef.current = now;
    audio?.onPlay?.();
    if (resolvedAudioSrc && audioRef.current) {
      audioRef.current.src = resolvedAudioSrc;
      audioRef.current.play();
    }
  }, [audio, canPlayAudio, resolvedAudioSrc]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;
    if (!autoPlayOnOpen || !open || wasOpen || !canPlayAudio) return;
    handlePlay();
  }, [autoPlayOnOpen, open, canPlayAudio, handlePlay]);

  useEffect(() => {
    lastPlayAtRef.current = 0;
  }, [resolvedAudioSrc, open]);

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      ariaLabel="Close word card"
      panelClassName="story-card"
      heightClassName="h-[45vh]"
      bodyClassName="px-5 pb-6 pt-4 text-[color:var(--foreground)] scrollbar-hide"
      header={
        <div className="word-card-top">
          <div className="flex items-center justify-between gap-3 mb-2 pl-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="word-card-title word-card-title--compact">
                {wordText}
              </span>
              {canPlayAudio && (
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={audio?.loading}
                  className="word-card-audio"
                  aria-label="Play pronunciation"
                >
                  <Volume2 size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="word-card-close"
            >
              <X size={18} />
            </button>
          </div>
          {phon && (
            <div
              className="word-card-phon"
              dangerouslySetInnerHTML={{ __html: phon }}
            />
          )}
          <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-subtle)] p-1 text-[color:var(--text-muted)] w-fit">
            <button
              type="button"
              onClick={() => briefAvailable && onModeChange("brief")}
              disabled={!briefAvailable}
              className={`${tabBaseClass} ${
                activeMode === "brief"
                  ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--foreground)]"
              } ${!briefAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {brief.label}
            </button>
            <button
              type="button"
              onClick={() => detailAvailable && onModeChange("detail")}
              disabled={!detailAvailable}
              className={`${tabBaseClass} ${
                activeMode === "detail"
                  ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--foreground)]"
              } ${!detailAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {detail.label}
            </button>
          </div>
        </div>
      }
      footer={
        activeContent.onRegenerate ? (
          <button
            type="button"
            onClick={activeContent.onRegenerate}
            disabled={activeContent.loading}
            className="word-card-regenerate"
          >
            {activeContent.loading ? "GENERATING..." : "REGENERATE"}
          </button>
        ) : null
      }
    >
      <div className="word-card-content min-h-[160px]">
        {activeContent.loading ? (
          <span className="word-card-loading">生成中…</span>
        ) : (
          <WordCardMarkdown
            content={activeContent.content}
            targetWord={wordText}
          />
        )}
      </div>
      {canPlayAudio && <audio ref={audioRef} src={resolvedAudioSrc} />}
    </MobileSheet>
  );
};
