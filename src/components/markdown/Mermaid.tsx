import { renderMermaid } from "beautiful-mermaid";

const THEME = {
  bg: "#ffffff",
  fg: "#000000",
  line: "#a3a3a3",
  accent: "#000000",
  muted: "#6b6b6b",
  surface: "#f4f4f4",
  border: "#d4d4d4",
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
