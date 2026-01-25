"use client";

import { useMemo, useRef } from "react";
import { Volume2 } from "lucide-react";
import Markdown from "react-markdown";

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
  contextLine,
  contextLoading = false,
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

  const contextLines = useMemo(() => {
    if (!contextLine) return [];
    return contextLine
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [contextLine]);

  const handlePlay = () => {
    if (!canPlayAudio) return;
    audio.onPlay?.();
    if (resolvedAudioSrc && audioRef.current) {
      audioRef.current.src = resolvedAudioSrc;
      audioRef.current.play();
    }
  };

  return (
    <div className={`space-y-4 text-[color:var(--foreground)] ${className}`}>
      <div className="sticky top-0 z-10 space-y-3 bg-[color:var(--background)]">
        {showTitle && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">
                {wordText}
              </h3>
              {canPlayAudio && (
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={audio?.loading}
                  className="inline-flex items-center text-foreground disabled:opacity-50"
                  aria-label="Play pronunciation"
                >
                  <Volume2 size={20} />
                </button>
              )}
            </div>
            {phon && (
              <div
                className="text-sm text-[color:var(--text-muted)]"
                dangerouslySetInnerHTML={{ __html: phon }}
              />
            )}
          </div>
        )}

        {(contextLoading || contextLines.length > 0) && (
          <div className="markdown-body border-b border-dashed border-[color:var(--border-subtle)] pb-3">
            {contextLoading ? (
              <div className="text-sm text-[color:var(--text-muted)]">
                上下文解析中…
              </div>
            ) : (
              contextLines.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className="text-sm text-[color:var(--text-muted)]"
                >
                  <Markdown>{`> ${line}`}</Markdown>
                </div>
              ))
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

      <div
        className={`min-h-[88px] text-[color:var(--foreground)] ${contentPaddingClass}`}
      >
        {activeContent.loading ? (
          <span className="text-sm text-[color:var(--text-muted)]">
            生成中…
          </span>
        ) : (
          <Markdown>{activeContent.content || ""}</Markdown>
        )}
      </div>
      {activeContent.onRegenerate && (
        <div className="sticky bottom-0 z-10 -mx-5 px-5 py-3 bg-[color:var(--background)]">
          <button
            type="button"
            onClick={activeContent.onRegenerate}
            disabled={activeContent.loading}
            className="text-xs uppercase tracking-[0.18em] story-muted-action disabled:opacity-50"
          >
            {activeContent.loading ? "GENERATING..." : "REGENERATE"}
          </button>
        </div>
      )}
      {canPlayAudio && <audio ref={audioRef} src={resolvedAudioSrc} />}
    </div>
  );
};
