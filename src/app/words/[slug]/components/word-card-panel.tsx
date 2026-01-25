"use client";

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

  return (
    <div className={`space-y-4 text-[color:var(--foreground)] ${className}`}>
      {showTitle && (
        <div className="space-y-2">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{wordText}</h3>
            {phon && (
              <div
                className="mt-2 text-sm text-[color:var(--text-muted)]"
                dangerouslySetInnerHTML={{ __html: phon }}
              />
            )}
          </div>
        </div>
      )}

      {contextLine && (
        <div className="border-b border-dashed border-[color:var(--border-subtle)] pb-3 text-sm text-[color:var(--text-muted)]">
          <Markdown>{`> ${contextLine}`}</Markdown>
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

      <div className="min-h-[88px] text-[color:var(--foreground)]">
        {activeContent.loading ? (
          <span className="text-sm text-[color:var(--text-muted)]">生成中…</span>
        ) : (
          <Markdown>{activeContent.content || ""}</Markdown>
        )}
      </div>

      {(audio?.onPlay || activeContent.onRegenerate) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {audio?.onPlay && (
            <button
              type="button"
              onClick={audio.onPlay}
              disabled={audio.loading || !audio.src}
              className="text-sm font-medium text-[color:var(--accent-warm)] hover:opacity-80 disabled:opacity-50"
            >
              {audio.loading ? "生成中…" : "播放发音"}
            </button>
          )}
          {activeContent.onRegenerate && (
            <button
              type="button"
              onClick={activeContent.onRegenerate}
              disabled={activeContent.loading}
              className="text-xs uppercase tracking-[0.18em] story-muted-action disabled:opacity-50"
            >
              {activeContent.loading ? "GENERATING..." : "REGENERATE"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
