"use client";

import type { ReactNode } from "react";
import Markdown from "react-markdown";

const readText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node.map((item) => readText(item)).join("");
  }
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return readText(props?.children);
  }
  return "";
};

const normalizeHeading = (raw: string): string => {
  const text = raw.trim();

  if (/^语境\d+$/.test(text)) {
    const index = Number(text.replace("语境", ""));
    return index === 1 ? "来源语境" : "历史语境";
  }

  if (/^语境\d+翻译$/.test(text)) {
    const index = Number(text.replace("语境", "").replace("翻译", ""));
    return index === 1 ? "来源语境翻译" : "历史语境翻译";
  }

  if (text === "语境原句") return "来源语境";
  if (text === "语境翻译") return "来源语境翻译";
  if (text === "语境片段") return "来源语境";
  return text;
};

const toUnifiedBriefContent = (raw: string): string => {
  if (!raw.trim()) return raw;

  let contextBlockIndex = 0;
  const replaced = raw.replace(
    /###\s*语境片段\s*\n([\s\S]*?)(?=\n###\s|$)/g,
    (_match, body) => {
      contextBlockIndex += 1;
      const text = String(body || "").trim();
      if (!text) return "";

      const sourceMatch = text.match(/原句[:：]\s*([\s\S]*?)(?=\s*翻译[:：]|$)/);
      const translationMatch = text.match(/翻译[:：]\s*([\s\S]*)$/);

      const source =
        sourceMatch?.[1]?.trim() || text.replace(/^原句[:：]\s*/, "").trim();
      const translation = translationMatch?.[1]?.trim() || "";

      const sourceHeading = contextBlockIndex === 1 ? "来源语境" : "历史语境";
      const translationHeading =
        contextBlockIndex === 1 ? "来源语境翻译" : "历史语境翻译";

      if (!translation) {
        return `### ${sourceHeading}\n${source}\n`;
      }

      return `### ${sourceHeading}\n${source}\n\n### ${translationHeading}\n${translation}\n`;
    },
  );

  return replaced;
};

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const highlightWord = (text: string, targetWord?: string): ReactNode => {
  const word = targetWord?.trim();
  if (!word) return text;

  const escaped = escapeRegExp(word);
  const wordLike = /^[A-Za-z][A-Za-z0-9_-]*$/.test(word);
  const pattern = wordLike
    ? new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?=[^A-Za-z0-9_]|$)`, "gi")
    : new RegExp(escaped, "gi");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  for (const match of text.matchAll(pattern)) {
    const matchText = match[0] ?? "";
    const start = match.index ?? 0;
    if (!matchText) continue;

    if (wordLike) {
      const prefix = match[1] ?? "";
      const capturedWord = match[2] ?? "";
      const prefixLength = prefix.length;
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      if (prefix) {
        parts.push(prefix);
      }
      parts.push(
        <mark key={`word-${index}`} className="word-card-target">
          {capturedWord}
        </mark>,
      );
      lastIndex = start + prefixLength + capturedWord.length;
    } else {
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      parts.push(
        <mark key={`word-${index}`} className="word-card-target">
          {matchText}
        </mark>,
      );
      lastIndex = start + matchText.length;
    }
    index += 1;
  }

  if (parts.length === 0) {
    return text;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

export const WordCardMarkdown = ({
  content,
  targetWord,
}: {
  content?: string;
  targetWord?: string;
}) => {
  const normalizedContent = toUnifiedBriefContent(content || "");
  let section:
    | "meaning"
    | "source"
    | "sourceTranslation"
    | "history"
    | "historyTranslation"
    | "other" = "other";
  return (
    <div className="word-card-markdown">
      <Markdown
        components={{
          h3: ({ children }) => {
            const label = normalizeHeading(readText(children));
            const isMeaning = label.includes("释义");
            if (label === "来源语境") {
              section = "source";
            } else if (label === "来源语境翻译") {
              section = "sourceTranslation";
            } else if (label === "历史语境") {
              section = "history";
            } else if (label === "历史语境翻译") {
              section = "historyTranslation";
            } else if (isMeaning) {
              section = "meaning";
            } else {
              section = "other";
            }
            return (
              <h3
                className={`word-card-md-heading ${isMeaning ? "word-card-md-heading--meaning" : "word-card-md-heading--context"}`}
              >
                {label}
              </h3>
            );
          },
          p: ({ children }) => {
            const rawText = readText(children);
            const text = rawText.trim();
            const isSource = /^原句[:：]/.test(text);
            const isTranslation = /^翻译[:：]/.test(text);
            const inSourceSection = section === "source";
            const inTranslationSection =
              section === "sourceTranslation" || section === "historyTranslation";
            const extraClass = inSourceSection || isSource
              ? "word-card-md-line word-card-md-line--source"
              : inTranslationSection || isTranslation
                ? "word-card-md-line word-card-md-line--translation"
                : "";

            if (inSourceSection && text) {
              return (
                <p className={`word-card-md-paragraph ${extraClass}`}>
                  {highlightWord(rawText, targetWord)}
                </p>
              );
            }

            return <p className={`word-card-md-paragraph ${extraClass}`}>{children}</p>;
          },
          ul: ({ children }) => <ul className="word-card-md-list">{children}</ul>,
          li: ({ children }) => <li className="word-card-md-list-item">{children}</li>,
        }}
      >
        {normalizedContent}
      </Markdown>
    </div>
  );
};
