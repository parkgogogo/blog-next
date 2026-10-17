import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import Image from "next/image";
import { all } from "@wooorm/starry-night";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStarryNight from "rehype-starry-night";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { VFile } from "vfile";
import Chart from "@/components/markdown/Chart";
import Mermaid from "@/components/markdown/Mermaid";
import { convertAttachmentUrls } from "@/lib/attachment";
import type { TableOfContentsItem } from "@/types/blog";
import {
  rehypeCollectToc,
  rehypeFigures,
  rehypeSpecialBlocks,
  rehypeTableCaptions,
  remarkAlerts,
  type AlertType,
} from "./plugins";

const onigurumaWasmUrl = pathToFileURL(
  path.join(process.cwd(), "src/lib/vendor/onig.wasm")
);

const ALERT_LABELS: Record<AlertType, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

function isOptimizedImage(src: string): boolean {
  return (
    src.startsWith("/api/attachment/") && /\.(avif|gif|jpe?g|png|webp)$/i.test(src)
  );
}

function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//.test(href);
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // 关闭单个 $ 的行内公式，避免价格（$5 / $10）被误判；行内公式写 $$x$$
  .use(remarkMath, { singleDollarTextMath: false })
  .use(remarkAlerts)
  .use(remarkRehype, {
    allowDangerousHtml: true,
    footnoteLabel: "Notes",
    footnoteLabelTagName: "h2",
    footnoteLabelProperties: { className: ["md-footnotes__label"] },
    footnoteBackLabel: "Back to reference",
  })
  .use(rehypeRaw)
  .use(rehypeSpecialBlocks)
  .use(rehypeFigures)
  .use(rehypeTableCaptions)
  .use(rehypeSlug)
  .use(rehypeCollectToc)
  .use(rehypeKatex, { strict: "ignore" })
  .use(rehypeStarryNight, {
    grammars: all,
    getOnigurumaUrlFs: async () => onigurumaWasmUrl,
  });

type DivProps = ComponentProps<"div"> & {
  "data-block"?: string;
  "data-source"?: string;
};

type BlockquoteProps = ComponentProps<"blockquote"> & {
  "data-alert"?: AlertType;
};

function Heading({
  as: Tag,
  id,
  children,
}: {
  as: "h2" | "h3" | "h4";
  id?: string;
  children?: ReactNode;
}) {
  return (
    <Tag id={id}>
      {children}
      {id && (
        <a href={`#${id}`} className="md-anchor" aria-label="Link to this section">
          #
        </a>
      )}
    </Tag>
  );
}

const components: Partial<Components> = {
  h2: ({ id, children, className }) =>
    className?.includes("md-footnotes__label") ? (
      <h2 id={id} className={className}>
        {children}
      </h2>
    ) : (
      <Heading as="h2" id={id}>
        {children}
      </Heading>
    ),
  h3: ({ id, children }) => (
    <Heading as="h3" id={id}>
      {children}
    </Heading>
  ),
  h4: ({ id, children }) => (
    <Heading as="h4" id={id}>
      {children}
    </Heading>
  ),
  a: ({ href, children, ...props }) =>
    isExternal(href) ? (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    ) : (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="md-table">
      <table>{children}</table>
    </div>
  ),
  blockquote: ({ children, ...props }: BlockquoteProps) => {
    const type = props["data-alert"];
    if (!type) return <blockquote>{children}</blockquote>;

    return (
      <div className="md-alert" data-alert={type} role="note">
        <p className="md-alert__label">{ALERT_LABELS[type]}</p>
        {children}
      </div>
    );
  },
  div: ({ children, ...props }: DivProps) => {
    const block = props["data-block"];
    const source = props["data-source"] ?? "";
    if (block === "chart") return <Chart source={source} />;
    if (block === "mermaid") return <Mermaid source={source} />;
    return <div {...props}>{children}</div>;
  },
  img: ({ src, alt, width, height }) => {
    const imageSrc = typeof src === "string" ? src : "";

    if (isOptimizedImage(imageSrc)) {
      return (
        <Image
          src={imageSrc}
          alt={alt || ""}
          width={1352}
          height={760}
          sizes="(min-width: 1024px) 940px, 100vw"
          quality={85}
        />
      );
    }

    return (
      // Markdown 图片来源不可控，使用原生 img 保证兼容
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageSrc} alt={alt || ""} width={width} height={height} loading="lazy" />
    );
  },
};

export interface RenderedMarkdown {
  content: ReactElement;
  toc: TableOfContentsItem[];
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const file = new VFile({ value: convertAttachmentUrls(markdown) });
  const tree = await processor.run(processor.parse(file), file);

  const content = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components,
  });

  return {
    content: <div className="prose">{content}</div>,
    toc: file.data.toc ?? [],
  };
}
