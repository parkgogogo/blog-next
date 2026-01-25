"use client";

import { useCallback, useState } from "react";
import { ILuluWord } from "@/lib/words/types";
import { Loader } from "lucide-react";
import {
  getExplanationAction,
  getWordCardAction,
} from "@/app/words/[slug]/actions";
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

  const handleClose = () => {
    setExpand(false);
  };

  const requestDetail = useCallback(
    async (options?: { force?: boolean }) => {
      setDetailLoading(true);
      try {
        const text = await getExplanationAction(word, options);
        setDetail(text);
        setExpand(true);
      } catch {
        setDetail("请求失败");
      } finally {
        setDetailLoading(false);
      }
    },
    [word],
  );

  const requestBrief = useCallback(
    async (options?: { force?: boolean }) => {
      setBriefLoading(true);
      try {
        const storyContext = stripHtml(word.context.line) || word.word;
        const text = await getWordCardAction(word, storyContext, options);
        setBrief(text);
        setExpand(true);
      } catch {
        setBrief("请求失败");
      } finally {
        setBriefLoading(false);
      }
    },
    [word],
  );

  const handleGetExplanation = async () => {
    if (detail || brief) {
      setExpand((current) => !current);
      return;
    }
    setLoading(true);
    setActiveMode("detail");
    try {
      await requestDetail();
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      if (activeMode === "brief") {
        await requestBrief({ force: true });
      } else {
        await requestDetail({ force: true });
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleModeChange = async (mode: WordCardMode) => {
    setActiveMode(mode);
    if (mode === "brief" && !brief && !briefLoading) {
      await requestBrief();
    }
    if (mode === "detail" && !detail && !detailLoading) {
      await requestDetail();
    }
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
                phon={word.phon}
                contextLine={stripHtml(word.context.line)}
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
                className="text-[color:var(--foreground)]"
              />
            </div>
            <div className="md:hidden">
              <WordCardSheet
                open={expand}
                onClose={handleClose}
                wordText={word.uuid}
                phon={word.phon}
                contextLine={stripHtml(word.context.line)}
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
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};
