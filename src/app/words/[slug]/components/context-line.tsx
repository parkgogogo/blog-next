"use client";

import { useState } from "react";
import { ILuluWord } from "@/lib/words/types";
import { Loader } from "lucide-react";
import { getWordCardBundleAction } from "@/app/words/[slug]/actions";
import {
  WordCardPanel,
  type WordCardMode,
} from "@/app/words/[slug]/components/word-card-panel";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";

const stripHtml = (text: string) =>
  text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export const ContextLine: React.FC<{ word: ILuluWord }> = ({ word }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [brief, setBrief] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<WordCardMode>("detail");
  const [briefLoading, setBriefLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contextLine, setContextLine] = useState<string>("");
  const [contextLoading, setContextLoading] = useState(false);

  const handleClose = () => {
    setExpand(false);
  };

  const requestBundle = async (options?: { force?: boolean }) => {
    const storyContext = stripHtml(word.context.line) || word.word;
    setBriefLoading(true);
    setDetailLoading(true);
    setContextLoading(true);
    try {
      const result = await getWordCardBundleAction(word.uuid, storyContext, {
        force: options?.force,
      });
      setContextLine(result.context || storyContext);
      setBrief(result.brief);
      setDetail(result.detail);
      setExpand(true);
    } catch {
      setBrief("请求失败");
      setDetail("请求失败");
    } finally {
      setBriefLoading(false);
      setDetailLoading(false);
      setContextLoading(false);
    }
  };

  const handleGetExplanation = async () => {
    if (detail || brief) {
      setExpand((current) => !current);
      return;
    }
    setLoading(true);
    setActiveMode("detail");
    try {
      await requestBundle();
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await requestBundle({ force: true });
    } finally {
      setRegenerating(false);
    }
  };

  const handleModeChange = async (mode: WordCardMode) => {
    setActiveMode(mode);
  };

  return (
    <>
      <div onClick={handleGetExplanation}>
        <div
          className="inline-block"
          dangerouslySetInnerHTML={{ __html: word.context.line }}
        />
      </div>
      {loading && (
        <Loader className="animate-spin mt-2 text-blue-500" size={16}></Loader>
      )}
      <div>
        {!loading && (detail || brief) && expand && (
          <>
            <div className="hidden md:block mt-5 text-gray-500 space-y-3">
              <WordCardPanel
                wordText={word.uuid}
                contextLine={contextLine}
                contextLoading={contextLoading}
                activeMode={activeMode}
                onModeChange={handleModeChange}
                brief={{
                  label: "简解",
                  content: brief,
                  loading:
                    briefLoading ||
                    (activeMode === "brief" && (loading || regenerating)),
                  onRegenerate: handleRegenerate,
                }}
                detail={{
                  label: "详解",
                  content: detail,
                  loading:
                    detailLoading ||
                    (activeMode === "detail" && (loading || regenerating)),
                  onRegenerate: handleRegenerate,
                }}
                showTitle={false}
                className="text-[color:var(--foreground)]"
              />
            </div>
            <div className="md:hidden">
              <WordCardSheet
                open={expand}
                onClose={handleClose}
                wordText={word.uuid}
                phon={word.phon}
                contextLine={contextLine}
                contextLoading={contextLoading}
                activeMode={activeMode}
                onModeChange={handleModeChange}
                brief={{
                  label: "简解",
                  content: brief,
                  loading:
                    briefLoading || (activeMode === "brief" && regenerating),
                  onRegenerate: handleRegenerate,
                }}
                detail={{
                  label: "详解",
                  content: detail,
                  loading:
                    detailLoading || (activeMode === "detail" && regenerating),
                  onRegenerate: handleRegenerate,
                }}
                audio={{
                  src: `/api/speech/${word.uuid}`,
                  onPlay: () => undefined,
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};
