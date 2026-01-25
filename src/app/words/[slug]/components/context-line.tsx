"use client";

import { useState } from "react";
import { ILuluWord } from "@/lib/words/types";
import { Loader, X } from "lucide-react";
import { getExplanationAction } from "@/app/words/[slug]/actions";
import Markdown from "react-markdown";
import { MobileSheet } from "@/components/MobileSheet";

export const ContextLine: React.FC<{ word: ILuluWord }> = ({ word }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [exp, setExp] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const handleClose = () => {
    setExpand(false);
  };

  const handleGetExplanation = async () => {
    if (exp) {
      setExpand((current) => !current);
      return;
    }
    setLoading(true);
    try {
      const text = await getExplanationAction(word);
      setExp(text);
      setExpand(true);
    } catch {
      setExp(`请求失败`);
    } finally {
      setLoading(false);
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const text = await getExplanationAction(word, { force: true });
      setExp(text);
      setExpand(true);
    } catch {
      setExp("请求失败");
    } finally {
      setRegenerating(false);
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
        {!loading && exp && expand && (
          <>
            <div className="hidden md:block mt-5 text-gray-500 space-y-3">
              <Markdown>{exp}</Markdown>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="text-xs uppercase tracking-[0.18em] text-gray-500 hover:text-gray-800 disabled:opacity-50"
              >
                {regenerating ? "GENERATING..." : "REGENERATE"}
              </button>
            </div>
            <div className="md:hidden">
              <MobileSheet
                open={expand}
                onClose={handleClose}
                ariaLabel="Close explanation"
                panelClassName="story-card"
                bodyClassName="px-5 py-4 space-y-3 text-[color:var(--foreground)] scrollbar-hide"
                header={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wide text-[color:var(--text-muted)]">
                      {word.uuid}
                    </span>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={handleClose}
                      className="text-[color:var(--text-muted)] hover:text-[color:var(--foreground)]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                }
                footer={
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                  >
                    {regenerating ? "GENERATING..." : "REGENERATE"}
                  </button>
                }
              >
                <Markdown>{exp}</Markdown>
              </MobileSheet>
            </div>
          </>
        )}
      </div>
    </>
  );
};
