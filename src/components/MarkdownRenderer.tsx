import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeStarryNight from "rehype-starry-night";
import { all } from "@wooorm/starry-night";
import { convertAttachmentUrls } from "@/lib/attachment";
import type { ReactNode } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { renderMermaid, THEMES } from "beautiful-mermaid";
import MermaidZoomable from "./MermaidZoomable";

interface MarkdownRendererProps {
  content: string;
  date?: string;
}

// Process text nodes to render hashtags as styled components
function processHashtagsInText(child: ReactNode): ReactNode {
  if (typeof child === "string") {
    const hashtagRegex = /#([a-zA-Z0-9_\u4e00-\u9fff]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = hashtagRegex.exec(child)) !== null) {
      // Add text before hashtag
      if (match.index > lastIndex) {
        parts.push(child.slice(lastIndex, match.index));
      }

      // Add hashtag component
      parts.push(
        <span
          key={`hashtag-${match.index}`}
          className="hashtag"
          data-hashtag={match[1]}
        >
          🏷 {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < child.length) {
      parts.push(child.slice(lastIndex));
    }

    return parts.length > 0 ? parts : child;
  }
  return child;
}

// Process children array to handle hashtags
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

export default async function MarkdownRenderer({
  content,
  date,
}: MarkdownRendererProps) {
  // Convert attachment URLs to API URLs
  const processedContent = convertAttachmentUrls(content);

  return (
    <div className="markdown-body">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          (options) => rehypeStarryNight({ ...options, grammars: all }),
        ]}
        components={{
          header: ({ children }) => (
            <div>
              <h1 className="text-3xl font-medium font-display text-foreground mb-4 leading-tight tracking-tight mt-0">
                {processChildren(children)}
              </h1>
              {date && (
                <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-400">
                  <time>{format(new Date(date), "d MMM, yyyy")}</time>
                </div>
              )}
            </div>
          ),
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
          code: async ({ className, children, node, ...props }) => {
            const language = className?.replace("language-", "");
            if (language === "mermaid") {
              const mermaidText = (extractText(node) || extractText(children))
                .replace(/^\n+|\n+$/g, "")
                .trim();
              const normalizedMermaidText = mermaidText.replace(/\\n/g, "\n");

              try {
                const svg = await renderMermaid(normalizedMermaidText, {
                  ...THEMES["zinc-light"],
                  font: "Inter",
                  transparent: true,
                });
                return <MermaidZoomable svg={svg} />;
              } catch {
                return (
                  <pre className="my-4 rounded bg-red-50 p-3 text-sm text-red-700 overflow-x-auto">
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
            return (
              <div className="flex flex-col items-center my-4">
                <Image
                  className="rounded-xl"
                  loading="lazy"
                  src={src as string}
                  alt={alt || "blog's image"}
                  width={650}
                  height={350}
                  quality={80}
                />
                <div className="italic text-sm mt-2 font-serif">{alt}</div>
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
