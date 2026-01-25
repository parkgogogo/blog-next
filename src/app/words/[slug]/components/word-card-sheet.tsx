"use client";

import { X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";
import {
  WordCardPanel,
  type WordCardMode,
} from "@/app/words/[slug]/components/word-card-panel";

interface WordCardSheetProps {
  open: boolean;
  onClose: () => void;
  wordText: string;
  phon?: string;
  contextLine?: string;
  activeMode: WordCardMode;
  onModeChange: (mode: WordCardMode) => void;
  brief: {
    label: string;
    content?: string;
    loading?: boolean;
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
  activeMode,
  onModeChange,
  brief,
  detail,
  audio,
}: WordCardSheetProps) => {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      ariaLabel="Close word card"
      panelClassName="story-card"
      bodyClassName="px-5 py-4 space-y-4 text-[color:var(--foreground)] scrollbar-hide"
      header={
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
              {wordText}
            </span>
            {phon && (
              <div
                className="mt-2 text-xs text-[color:var(--text-muted)]"
                dangerouslySetInnerHTML={{ __html: phon }}
              />
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
      }
    >
      <WordCardPanel
        wordText={wordText}
        contextLine={contextLine}
        activeMode={activeMode}
        onModeChange={onModeChange}
        brief={brief}
        detail={detail}
        audio={audio}
        showTitle={false}
      />
    </MobileSheet>
  );
};
