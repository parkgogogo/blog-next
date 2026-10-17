import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Blockquote, Paragraph, Root as MdastRoot } from "mdast";
import { toString } from "hast-util-to-string";
import { visit, SKIP } from "unist-util-visit";
import type { VFile } from "vfile";
import type { TableOfContentsItem } from "@/types/blog";

const ALERT_TYPES = ["note", "tip", "important", "warning", "caution"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

/**
 * GitHub 风格提示块：`> [!NOTE]` 开头的引用块
 */
export function remarkAlerts() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (first?.type !== "paragraph") return;

      const text = first.children[0];
      if (text?.type !== "text") return;

      const match = text.value.match(/^\[!(\w+)\][ \t]*(?:\r?\n|$)/);
      const type = match?.[1].toLowerCase() as AlertType | undefined;
      if (!match || !type || !ALERT_TYPES.includes(type)) return;

      text.value = text.value.slice(match[0].length);
      if (text.value === "") {
        (first as Paragraph).children.shift();
        // 去掉紧跟在标记后的换行
        const next = first.children[0];
        if (next?.type === "break") first.children.shift();
      }
      if (first.children.length === 0) node.children.shift();

      node.data = {
        ...node.data,
        hProperties: { className: ["md-alert"], dataAlert: type },
      };
    });
  };
}

/**
 * 把 ```chart / ```mermaid 代码块换成占位 div，交给组件渲染
 * 需要在语法高亮之前运行
 */
export function rehypeSpecialBlocks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;

      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code"
      );
      const classes = (code?.properties.className as string[] | undefined) ?? [];
      const block = ["chart", "mermaid"].find((name) =>
        classes.includes(`language-${name}`)
      );
      if (!code || !block) return;

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { dataBlock: block, dataSource: toString(code) },
        children: [],
      };
      return SKIP;
    });
  };
}

function isWhitespace(node: ElementContent): boolean {
  return node.type === "text" && node.value.trim() === "";
}

function findImage(node: ElementContent): Element | undefined {
  if (node.type !== "element") return undefined;
  if (node.tagName === "img") return node;
  if (node.tagName === "a") {
    const inner = node.children.filter((child) => !isWhitespace(child));
    if (inner.length === 1) return findImage(inner[0]);
  }
  return undefined;
}

/** alt 里常见的无意义占位文本，不当作图注 */
function isMeaningfulCaption(text: string): boolean {
  const value = text.trim();
  return (
    value !== "" &&
    !/^(image|img|图片|截图|screenshot)$/i.test(value) &&
    !/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(value)
  );
}

/**
 * 独占一段的图片升级为 <figure>，title 优先作为图注，其次是 alt
 */
export function rehypeFigures() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "p" || !parent || index === undefined) return;

      const content = node.children.filter((child) => !isWhitespace(child));
      if (content.length !== 1) return;

      const image = findImage(content[0]);
      if (!image) return;

      const title = String(image.properties.title ?? "");
      const alt = String(image.properties.alt ?? "");
      const caption = isMeaningfulCaption(title)
        ? title
        : isMeaningfulCaption(alt)
          ? alt
          : "";
      delete image.properties.title;

      const children: ElementContent[] = [content[0]];
      if (caption) {
        children.push({
          type: "element",
          tagName: "figcaption",
          properties: {},
          children: [{ type: "text", value: caption }],
        });
      }

      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: { className: ["md-figure"] },
        children,
      };
      return SKIP;
    });
  };
}

const TABLE_CAPTION = /^\s*(?:表|Table)\s*\d+(?:\.\d+)?\s*[｜|:：]/i;

function isTable(node: ElementContent | undefined): node is Element {
  return node?.type === "element" && node.tagName === "table";
}

function isTableCaption(node: ElementContent | undefined): node is Element {
  return node?.type === "element" && node.tagName === "p" && TABLE_CAPTION.test(toString(node));
}

/** 跳过空白文本，找相邻的元素节点 */
function siblingIndex(children: ElementContent[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < children.length; i += step) {
    if (!isWhitespace(children[i])) return i;
  }
  return -1;
}

/**
 * 紧挨表格、以「表 N ｜」开头的段落作为表注，和表格合成 <figure>，表注统一放在表格下方。
 * 优先认表格上方的段落；下方的段落如果后面紧跟另一张表，留给那张表。
 */
export function rehypeTableCaptions() {
  return (tree: HastRoot) => {
    visit(tree, (node) => {
      if (!("children" in node)) return;
      const children = node.children as ElementContent[];

      for (let i = 0; i < children.length; i++) {
        const table = children[i];
        if (!isTable(table)) continue;

        const prev = siblingIndex(children, i, -1);
        const next = siblingIndex(children, i, 1);
        let captionIndex = -1;
        if (prev !== -1 && isTableCaption(children[prev])) {
          captionIndex = prev;
        } else if (
          next !== -1 &&
          isTableCaption(children[next]) &&
          !isTable(children[siblingIndex(children, next, 1)])
        ) {
          captionIndex = next;
        }
        if (captionIndex === -1) continue;

        const caption = children[captionIndex] as Element;
        const start = Math.min(i, captionIndex);
        children.splice(start, Math.abs(i - captionIndex) + 1, {
          type: "element",
          tagName: "figure",
          properties: { className: ["md-table-figure"] },
          children: [
            table,
            { type: "element", tagName: "figcaption", properties: {}, children: caption.children },
          ],
        });
        i = start;
      }
    });
  };
}

/**
 * 收集 h2/h3 作为目录，需在 rehype-slug 之后运行
 */
export function rehypeCollectToc() {
  return (tree: HastRoot, file: VFile) => {
    const toc: TableOfContentsItem[] = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties.id;
      if (typeof id !== "string" || id === "footnote-label") return;

      toc.push({
        id,
        title: toString(node).trim(),
        level: node.tagName === "h2" ? 2 : 3,
      });
    });

    file.data.toc = toc;
  };
}

declare module "vfile" {
  interface DataMap {
    toc: TableOfContentsItem[];
  }
}
