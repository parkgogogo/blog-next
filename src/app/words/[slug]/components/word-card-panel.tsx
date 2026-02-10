"use client";

import { useRef } from "react";
import { Volume2 } from "lucide-react";
import { WordCardMarkdown } from "@/app/words/[slug]/components/word-card-markdown";

export type WordCardMode = "brief" | "detail";

interface WordCardContent {
  label: string;
  content?: string;
  loading?: boolean;
  available?: boolean;
  onRegenerate?: () => void;
}

interface WordCardAudio {
  src?: string;
  loading?: boolean;
  onPlay?: () => void;
}

interface WordCardPanelProps {
  wordText: string;
  phon?: string;
  contextLine?: string;
  contextLoading?: boolean;
  activeMode: WordCardMode;
  onModeChange: (mode: WordCardMode) => void;
  brief: WordCardContent;
  detail: WordCardContent;
  audio?: WordCardAudio;
  showTitle?: boolean;
  className?: string;
}

const tabBaseClass =
  "px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] rounded-full transition";

export const WordCardPanel = ({
  wordText,
  phon,
  activeMode,
  onModeChange,
  brief,
  detail,
  audio,
  showTitle = true,
  className = "",
}: WordCardPanelProps) => {
  const activeContent = activeMode === "brief" ? brief : detail;
  const briefAvailable = brief.available ?? true;
  const detailAvailable = detail.available ?? true;
  const contentPaddingClass = activeContent.onRegenerate ? "pb-0" : "";
  const audioRef = useRef<HTMLAudioElement>(null);
  const resolvedAudioSrc = audio?.src;
  const canPlayAudio = Boolean(resolvedAudioSrc);

  const handlePlay = () => {
    if (!canPlayAudio) return;
    audio?.onPlay?.();
    if (resolvedAudioSrc && audioRef.current) {
      audioRef.current.src = resolvedAudioSrc;
      audioRef.current.play();
    }
  };

  return (
    <div className={`word-card-shell ${className}`}>
      <div className="word-card-top sticky top-0 z-10">
        {showTitle && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="word-card-title">{wordText}</h3>
              {canPlayAudio && (
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={audio?.loading}
                  className="word-card-audio"
                  aria-label="Play pronunciation"
                >
                  <Volume2 size={20} />
                </button>
              )}
            </div>
            {phon && (
              <div
                className="word-card-phon"
                dangerouslySetInnerHTML={{ __html: phon }}
              />
            )}
          </div>
        )}

        <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-subtle)] p-1 text-[color:var(--text-muted)]">
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

      <div className={`word-card-content min-h-[88px] ${contentPaddingClass}`}>
        {activeContent.loading ? (
          <span className="word-card-loading">生成中…</span>
        ) : (
          <WordCardMarkdown content={activeContent.content} targetWord={wordText} />
        )}
      </div>
      {activeContent.onRegenerate && (
        <div className="sticky bottom-0 z-10 -mx-5 px-5 py-3 bg-[color:var(--background)]">
          <button
            type="button"
            onClick={activeContent.onRegenerate}
            disabled={activeContent.loading}
            className="word-card-regenerate"
          >
            {activeContent.loading ? "GENERATING..." : "REGENERATE"}
          </button>
        </div>
      )}
      {canPlayAudio && <audio ref={audioRef} src={resolvedAudioSrc} />}
    </div>
  );
};
