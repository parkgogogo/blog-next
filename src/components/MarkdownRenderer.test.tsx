import { prerenderToNodeStream } from "react-dom/static";
import { describe, expect, it } from "vitest";

import MarkdownRenderer from "@/components/MarkdownRenderer";

async function renderMarkdown(content: string): Promise<string> {
  const element = await MarkdownRenderer({ content });
  const { prelude } = await prerenderToNodeStream(element);

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

describe("MarkdownRenderer image rendering", () => {
  it("renders uncontrolled markdown image sources with plain img", async () => {
    const html = await renderMarkdown("![Test Image](/next.svg)");

    expect(html).toContain("<img");
    expect(html).toContain('src="/next.svg"');
    expect(html).not.toContain("data-nimg=");
    expect(html).not.toContain("/_next/image?url=");
  });

  it("keeps controlled attachment raster images on next/image", async () => {
    const html = await renderMarkdown("![Attachment](/api/attachment/example.webp)");

    expect(html).toContain('src="/_next/image?url=%2Fapi%2Fattachment%2Fexample.webp');
    expect(html).toContain("data-nimg=");
  });
});
