"use client";

import { useRef } from "react";
import { Volume2, X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";
import Markdown from "react-markdown";
import { type WordCardMode } from "@/app/words/[slug]/components/word-card-panel";

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
}

export const WordCardSheet = ({
  open,
  onClose,
  wordText,
  phon,
  contextLine,
  contextLines,
  contextLoading = false,
  activeMode,
  onModeChange,
  brief,
  detail,
  audio,
}: WordCardSheetProps) => {
  const activeContent = activeMode === "brief" ? brief : detail;
  const briefAvailable = brief.available ?? true;
  const detailAvailable = detail.available ?? true;
  const audioRef = useRef<HTMLAudioElement>(null);
  const resolvedAudioSrc = audio?.src;
  const canPlayAudio = Boolean(resolvedAudioSrc);
  const resolvedContextLines =
    contextLines && contextLines.length > 0
      ? contextLines
      : contextLine
        ? [{ line: contextLine }]
        : [];
  const contextListLoading =
    contextLoading && resolvedContextLines.length === 0;

  const handlePlay = () => {
    if (!canPlayAudio) return;
    audio?.onPlay?.();
    if (resolvedAudioSrc && audioRef.current) {
      audioRef.current.src = resolvedAudioSrc;
      audioRef.current.play();
    }
  };

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      ariaLabel="Close word card"
      panelClassName="story-card"
      bodyClassName="px-5 pb-6 pt-4 text-[color:var(--foreground)] scrollbar-hide"
      header={
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                {wordText}
              </span>
              {canPlayAudio && (
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={audio?.loading}
                  className="inline-flex items-center text-[color:var(--text-muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
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
              className="text-[color:var(--text-muted)] hover:text-[color:var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          {phon && (
            <div
              className="text-xs text-[color:var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: phon }}
            />
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
      }
      footer={
        activeContent.onRegenerate ? (
          <button
            type="button"
            onClick={activeContent.onRegenerate}
            disabled={activeContent.loading}
            className="text-xs uppercase tracking-[0.18em] story-muted-action disabled:opacity-50"
          >
            {activeContent.loading ? "GENERATING..." : "REGENERATE"}
          </button>
        ) : null
      }
    >
      <div className="min-h-[160px] space-y-6 text-[color:var(--foreground)]">
        <section className="word-sheet-section">
          <div className="word-sheet-section-title">词义</div>
          <div className="word-sheet-section-body">
            {activeContent.loading ? (
              <span className="text-sm text-[color:var(--text-muted)]">
                生成中…
              </span>
            ) : (
              <Markdown>{activeContent.content || ""}</Markdown>
            )}
          </div>
        </section>
        <section className="word-sheet-section">
          <div className="word-sheet-section-title">
            语境记录
            {resolvedContextLines.length > 0
              ? ` (${resolvedContextLines.length})`
              : ""}
          </div>
          {resolvedContextLines.length === 0 ? (
            <div className="text-sm text-[color:var(--text-muted)]">
              {contextListLoading ? "语境解析中…" : "暂无语境记录"}
            </div>
          ) : (
            <div className="word-sheet-context-list">
              {resolvedContextLines.map((item, index) => (
                <div
                  key={`${item.line}-${index}`}
                  className="word-sheet-context-item"
                >
                  <div className="word-sheet-context-line">{item.line}</div>
                  {item.translation ? (
                    <div className="word-sheet-context-translation">
                      {item.translation}
                    </div>
                  ) : contextLoading ? (
                    <div className="word-sheet-context-translation word-sheet-context-translation--loading">
                      翻译中…
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {canPlayAudio && <audio ref={audioRef} src={resolvedAudioSrc} />}
    </MobileSheet>
  );
};
