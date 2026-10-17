import { renderMermaid } from "beautiful-mermaid";

// 传入页面的 CSS 变量而不是色值，SVG 随亮暗主题切换。
// 名字不能和库自己写在 <svg style> 上的 --fg 等相同，否则自引用失效，所以用 --mm-*
const THEME = {
  bg: "var(--mm-bg)",
  fg: "var(--mm-fg)",
  line: "var(--mm-line)",
  accent: "var(--mm-fg)",
  muted: "var(--mm-muted)",
  surface: "var(--mm-surface)",
  border: "var(--mm-border)",
};

/**
 * beautiful-mermaid 只认 `A -->|label| B`，把同样合法的 `A -- label --> B`
 * 和 `A == label ==> B` 转成这种写法
 */
export function normalizeMermaid(source: string): string {
  return source
    .trim()
    .replace(/\s--\s+([^\n]+?)\s+-->/g, " -->|$1|")
    .replace(/\s==\s+([^\n]+?)\s+==>/g, " ==>|$1|");
}

export default async function Mermaid({ source }: { source: string }) {
  const text = normalizeMermaid(source);

  try {
    const svg = await renderMermaid(text, {
      ...THEME,
      font: "Inter",
      transparent: true,
    });

    return (
      <figure className="md-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
    );
  } catch {
    return <pre className="md-block-error">{`Mermaid render failed.\n\n${text}`}</pre>;
  }
}
