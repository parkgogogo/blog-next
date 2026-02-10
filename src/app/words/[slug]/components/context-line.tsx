"use client";

import { useEffect, useRef, useState } from "react";
import { ILuluWord } from "@/lib/words/types";
import { streamPluginWordCard } from "@/lib/words/card-sse-client";
import {
  WordCardPanel,
  type WordCardMode,
} from "@/app/words/[slug]/components/word-card-panel";
import { WordCardSheet } from "@/app/words/[slug]/components/word-card-sheet";

const stripHtml = (text: string) =>
  text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export const ContextLine: React.FC<{ word: ILuluWord }> = ({ word }) => {
  const [brief, setBrief] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<WordCardMode>("brief");
  const [briefLoading, setBriefLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contextLine, setContextLine] = useState<string>("");
  const [contextLoading, setContextLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleClose = () => {
    setExpand(false);
  };

  const requestBundle = async (options?: { force?: boolean }) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const sourceSentence = stripHtml(word.context.line) || word.word;
    setExpand(true);
    setBriefLoading(true);
    setDetailLoading(true);
    setContextLoading(false);
    setContextLine(sourceSentence);
    setBrief("");
    setDetail("");

    let briefText = "";
    let detailText = "";

    try {
      const [briefResult, detailResult] = await Promise.all([
        streamPluginWordCard({
          word: word.uuid,
          sourceSentence,
          mode: "brief",
          force: options?.force,
          onDelta: (delta) => {
            briefText += delta;
            if (requestIdRef.current !== requestId) return;
            setBriefLoading(false);
            setBrief(briefText);
          },
        }),
        streamPluginWordCard({
          word: word.uuid,
          sourceSentence,
          mode: "detail",
          force: options?.force,
          onDelta: (delta) => {
            detailText += delta;
            if (requestIdRef.current !== requestId) return;
            setDetailLoading(false);
            setDetail(detailText);
          },
        }),
      ]);

      if (requestIdRef.current !== requestId) return;
      const resolvedContext =
        briefResult.meta?.primaryContext ||
        detailResult.meta?.primaryContext ||
        sourceSentence;
      setContextLine(resolvedContext);
      setBrief(briefResult.content || briefText || "暂无内容");
      setDetail(detailResult.content || detailText || "暂无内容");
    } catch {
      if (requestIdRef.current !== requestId) return;
      setBrief("请求失败");
      setDetail("请求失败");
    } finally {
      if (requestIdRef.current !== requestId) return;
      setBriefLoading(false);
      setDetailLoading(false);
    }
  };

  const handleGetExplanation = async () => {
    if (detail || brief) {
      setExpand((current) => !current);
      return;
    }
    setActiveMode("brief");
    await requestBundle();
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
      <div>
        {expand && (
          <>
            {!isMobile && (
              <div className="mt-5 space-y-3">
                <WordCardPanel
                  wordText={word.uuid}
                  contextLine={contextLine}
                  contextLoading={contextLoading}
                  activeMode={activeMode}
                  onModeChange={handleModeChange}
                  brief={{
                    label: "简解",
                    content: brief,
                    loading: briefLoading || (activeMode === "brief" && regenerating),
                    onRegenerate: handleRegenerate,
                  }}
                  detail={{
                    label: "详解",
                    content: detail,
                    loading: detailLoading || (activeMode === "detail" && regenerating),
                    onRegenerate: handleRegenerate,
                  }}
                  showTitle={false}
                  className="text-[color:var(--foreground)]"
                />
              </div>
            )}
            {isMobile && (
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
            )}
          </>
        )}
      </div>
    </>
  );
};
