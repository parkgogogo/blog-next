import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BlogLayout from "./layout";

describe("BlogLayout", () => {
  it("keeps the desktop logo fixed near the top-left while content scrolls", async () => {
    const element = await BlogLayout({
      children: <main>Blog content</main>,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Blog content");
    expect(html).toContain("md:fixed");
    expect(html).toContain("md:left-6");
    expect(html).toContain("md:top-3");
  });
});
