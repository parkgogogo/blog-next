import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeStarryNight from "rehype-starry-night";
import { all } from "@wooorm/starry-night";
import { convertAttachmentUrls } from "@/lib/attachment";
import type { ReactNode } from "react";
import Image from "next/image";
import { renderMermaid, THEMES } from "beautiful-mermaid";
import path from "node:path";
import { pathToFileURL } from "node:url";
import MermaidZoomable from "./MermaidZoomable";

interface MarkdownRendererProps {
  content: string;
}

const onigurumaWasmUrl = pathToFileURL(
  path.join(process.cwd(), "src/lib/vendor/onig.wasm")
);

function processHashtagsInText(child: ReactNode): ReactNode {
  if (typeof child === "string") {
    const hashtagRegex = /#([a-zA-Z0-9_\u4e00-\u9fff]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = hashtagRegex.exec(child)) !== null) {
      if (match.index > lastIndex) {
        parts.push(child.slice(lastIndex, match.index));
      }

      parts.push(
        <span
          key={`hashtag-${match.index}`}
          className="hashtag"
          data-hashtag={match[1]}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < child.length) {
      parts.push(child.slice(lastIndex));
    }

    return parts.length > 0 ? parts : child;
  }
  return child;
}

function processChildren(children: ReactNode): ReactNode {
  return Array.isArray(children)
    ? children.map(processHashtagsInText).flat()
    : processHashtagsInText(children);
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value) return "";

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).join("");
  }

  if (typeof value === "object") {
    const maybeNode = value as {
      value?: unknown;
      children?: unknown;
      props?: { children?: unknown };
    };

    if (typeof maybeNode.value === "string") {
      return maybeNode.value;
    }

    if (maybeNode.children !== undefined) {
      return extractText(maybeNode.children);
    }

    if (maybeNode.props?.children !== undefined) {
      return extractText(maybeNode.props.children);
    }
  }

  return "";
}

function isOptimizedMarkdownImage(src: string): boolean {
  if (!src.startsWith("/api/attachment/")) {
    return false;
  }

  return /\.(avif|gif|jpe?g|png|webp)$/i.test(src);
}

export default async function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const processedContent = convertAttachmentUrls(content);

  return (
    <div className="markdown-body prose max-w-none">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          (options) =>
            rehypeStarryNight({
              ...options,
              grammars: all,
              getOnigurumaUrlFs: async () => onigurumaWasmUrl,
            }),
        ]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-0 text-[30px] font-semibold leading-[42px] text-[color:var(--foreground-strong)]">
              {processChildren(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-10 text-2xl font-semibold leading-8 text-[color:var(--foreground-strong)]">
              {processChildren(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-8 text-xl font-semibold leading-7 text-[color:var(--foreground-strong)]">
              {processChildren(children)}
            </h3>
          ),
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
          code: async ({ className, children, node, ...props }) => {
            const language = className?.replace("language-", "");
            if (language === "mermaid") {
              const mermaidText = (extractText(node) || extractText(children))
                .replace(/^\n+|\n+$/g, "")
                .trim();
              const normalizedMermaidText = mermaidText.replace(/\\n/g, " ");

              try {
                const svg = await renderMermaid(normalizedMermaidText, {
                  ...THEMES["zinc-light"],
                  font: "Inter",
                  // Keep theme background so node fills/lines have stable contrast.
                  transparent: false,
                });
                return <MermaidZoomable svg={svg} />;
              } catch {
                return (
                  <pre className="my-4 overflow-x-auto rounded bg-red-50 p-3 text-sm text-red-700">
                    Mermaid render failed.\n{mermaidText}
                  </pre>
                );
              }
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img: ({ src, alt }) => {
            const imageSrc = typeof src === "string" ? src : "";

            if (!imageSrc || !isOptimizedMarkdownImage(imageSrc)) {
              return (
                <div className="my-4 flex flex-col items-center">
                  {/* Markdown image sources are uncontrolled; prefer native img for compatibility. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="h-auto max-w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
                    loading="lazy"
                    src={imageSrc}
                    alt={alt || "blog's image"}
                  />
                  {alt && (
                    <div className="mt-2 text-sm leading-5 text-[color:var(--text-muted)]">
                      {alt}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="my-4 flex flex-col items-center">
                <Image
                  className="h-auto max-w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
                  loading="lazy"
                  src={imageSrc}
                  alt={alt || "blog's image"}
                  width={650}
                  height={350}
                  quality={80}
                />
                {alt && (
                  <div className="mt-2 text-sm leading-5 text-[color:var(--text-muted)]">
                    {alt}
                  </div>
                )}
              </div>
            );
          },
        }}
      >
        {processedContent}
      </MarkdownAsync>
    </div>
  );
}
