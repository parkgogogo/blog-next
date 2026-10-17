import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/posts", () => ({
  PostService: {
    getAllPosts: vi.fn(async () => [
      {
        slug: "brand-signal",
        title: "Brand Signal",
        date: "2026-06-12T00:00:00.000Z",
        content: "A post that keeps Parkgogogo connected to parkgogogo.me.",
        excerpt: "A post that keeps Parkgogogo connected to parkgogogo.me.",
        tags: ["seo"],
        readingTime: 3,
        category: "Notes",
        categoryPath: "posts/Notes",
      },
      {
        slug: "eval-report",
        title: "Eval Report",
        date: "2026-06-01T00:00:00.000Z",
        content: "Benchmarks.",
        excerpt: "Benchmarks.",
        subtitle: "A subtitle wins over the excerpt",
        category: "Eval",
        categoryPath: "posts/Eval",
      },
    ]),
  },
}));

import HomePage, { metadata } from "./page";

describe("HomePage", () => {
  it("keeps the root page metadata focused on the Parkgogogo brand query", () => {
    expect(metadata.title).toBe("Parkgogogo");
    expect(metadata.description).toContain("parkgogogo.me");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["Parkgogogo", "parkgogogo", "parkgogogo.me"])
    );
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("renders the bilingual bio and identity structured data", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("在比特世界留下我的踪迹");
    expect(html).toContain("Life finds a way.");
    expect(html).toContain("parkgogogo.me");
    expect(html).toContain("https://github.com/parkgogogo");
    expect(html).toContain("WebSite");
    expect(html).toContain("ProfilePage");
  });

  it("keeps the homepage h1 limited to the author display name", async () => {
    const html = renderToStaticMarkup(await HomePage());
    const headings = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];

    expect(headings).toHaveLength(1);
    expect((headings[0] ?? "").replace(/<[^>]+>/g, "").trim()).toBe("Gerard Parker");
  });

  it("lists every post with category, date and summary, plus category tabs", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain('href="/blog/brand-signal"');
    expect(html).toContain("Brand Signal");
    expect(html).toContain("Jun 12, 2026");
    expect(html).toContain("A subtitle wins over the excerpt");
    expect(html).toMatch(/role="tab"[^>]*>All</);
    expect(html).toMatch(/role="tab"[^>]*>Eval</);
  });
});
