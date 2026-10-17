import { readFileSync } from "node:fs";
import { prerenderToNodeStream } from "react-dom/static";
import { describe, expect, it } from "vitest";
import { normalizeMermaid } from "@/components/markdown/Mermaid";
import { renderMarkdown } from "@/lib/markdown/render";
import { MARKDOWN_TEST_FILE } from "@/lib/markdown/test-content";
import { parsePost } from "@/lib/posts";

async function toHtml(markdown: string): Promise<string> {
  const { content } = await renderMarkdown(markdown);
  const { prelude } = await prerenderToNodeStream(content);

  return await new Promise((resolve, reject) => {
    let html = "";
    prelude.setEncoding("utf8");
    prelude.on("data", (chunk) => {
      html += chunk;
    });
    prelude.on("end", () => resolve(html));
    prelude.on("error", reject);
  });
}

describe("renderMarkdown images", () => {
  it("promotes a standalone image to a figure, using title as the caption", async () => {
    const html = await toHtml('![Alt text](/a.png "Figure 1: caption")');

    expect(html).toContain('<figure class="md-figure">');
    expect(html).toContain("<figcaption>Figure 1: caption</figcaption>");
    expect(html).not.toMatch(/<p>\s*<figure/);
  });

  it("falls back to alt for captions but ignores file names", async () => {
    expect(await toHtml("![A diagram](/a.png)")).toContain("<figcaption>A diagram</figcaption>");
    expect(await toHtml("![image.png](/a.png)")).not.toContain("<figcaption>");
  });

  it("keeps inline images inside their paragraph", async () => {
    const html = await toHtml("Before ![icon](/a.svg) after.");

    expect(html).toMatch(/<p>Before <img[^>]*> after\.<\/p>/);
    expect(html).not.toContain("<figure");
  });

  it("keeps controlled attachment raster images on next/image", async () => {
    const html = await toHtml("![Attachment](/api/attachment/example.webp)");

    expect(html).toContain("/_next/image?url=%2Fapi%2Fattachment%2Fexample.webp");
  });
});

describe("renderMarkdown blocks", () => {
  it("renders GitHub alerts without the marker text", async () => {
    const html = await toHtml("> [!WARNING]\n> Data may be contaminated.");

    expect(html).toContain('data-alert="warning"');
    expect(html).toContain("Warning");
    expect(html).toContain("Data may be contaminated.");
    expect(html).not.toContain("[!WARNING]");
  });

  it("keeps plain blockquotes as blockquotes", async () => {
    expect(await toHtml("> quoted")).toContain("<blockquote>");
  });

  it("wraps tables in a scroll container and keeps column alignment", async () => {
    const html = await toHtml("| Model | Score |\n| :-- | --: |\n| A | 1.0 |");

    expect(html).toContain('<div class="md-table"><table>');
    expect(html).toContain('style="text-align:right"');
  });

  it("renders chart blocks as SVG and reports invalid specs", async () => {
    const chart = JSON.stringify({
      title: "Bench",
      labels: ["A", "B"],
      series: [{ name: "s", values: [1, 2] }],
    });
    const html = await toHtml(`\`\`\`chart\n${chart}\n\`\`\``);

    expect(html).toContain('<figure class="md-chart">');
    expect(html).toContain("<svg");
    expect(html).toContain("Bench");

    const invalid = await toHtml('```chart\n{"type":"pie"}\n```');
    expect(invalid).toContain("Chart spec invalid");
  });

  it("highlights code blocks", async () => {
    const html = await toHtml("```ts\nconst a = 1;\n```");

    expect(html).toContain('class="pl-k"');
  });
});

describe("renderMarkdown math, footnotes and headings", () => {
  it("renders $$ math with KaTeX but leaves single dollar prices alone", async () => {
    const html = await toHtml("Accuracy $$\\frac{a}{b}$$ costs $5 and $10.");

    expect(html).toContain('class="katex"');
    expect(html).toContain("costs $5 and $10.");
  });

  it("renders footnotes with a Notes label", async () => {
    const html = await toHtml("Claim[^1].\n\n[^1]: Source.");

    expect(html).toContain("data-footnote-ref");
    expect(html).toContain('class="md-footnotes__label"');
    expect(html).toContain("Notes");
  });

  it("collects h2/h3 headings into the table of contents", async () => {
    const { toc } = await renderMarkdown("## One\n\n### Two `code`\n\n#### Skipped\n\nText[^1]\n\n[^1]: note");

    expect(toc).toEqual([
      { id: "one", title: "One", level: 2 },
      { id: "two-code", title: "Two code", level: 3 },
    ]);
  });
});

describe("normalizeMermaid", () => {
  it("rewrites `-- label -->` edges into the pipe form", () => {
    expect(normalizeMermaid("flowchart LR\n  C -- yes --> D\n  A == hot ==> B")).toBe(
      "flowchart LR\n  C -->|yes| D\n  A ==>|hot| B"
    );
  });
});

describe("markdown test page content", () => {
  it("renders the full kitchen-sink document without block errors other than the intentional one", async () => {
    const post = parsePost(readFileSync(MARKDOWN_TEST_FILE, "utf8"), "markdown", "markdown");
    const html = await toHtml(post.content);

    expect(html.match(/md-block-error/g)).toHaveLength(1);
    expect(html).not.toContain("Mermaid render failed");
    expect(html.match(/<figure class="md-chart">/g)).toHaveLength(3);
    expect(html.match(/<figure class="md-mermaid"/g)).toHaveLength(2);
  });
});
