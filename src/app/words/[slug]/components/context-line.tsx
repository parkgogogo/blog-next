"use client";

import React, { useState } from "react";
import { ILuluWord } from "@/lib/words/types";
import { Loader } from "lucide-react";
import { getExplanationAction } from "@/app/words/[slug]/actions";
import Markdown from "react-markdown";

export const ContextLine: React.FC<{ word: ILuluWord }> = ({ word }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [exp, setExp] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const handleGetExplanation = async () => {
    if (exp) {
      setExpand(!expand);
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
          <div className="mt-5 text-gray-500 space-y-3">
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
        )}
      </div>
    </>
  );
};
