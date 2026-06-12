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
        category: "notes",
        categoryPath: "posts/notes",
      },
    ]),
  },
}));

import HomePage, { metadata } from "./page";

describe("HomePage SEO", () => {
  it("keeps the root page metadata focused on the Parkgogogo brand query", () => {
    expect(metadata.title).toBe("Parkgogogo");
    expect(metadata.description).toContain("parkgogogo.me");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["Parkgogogo", "parkgogogo", "parkgogogo.me"])
    );
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("renders brand, identity, and structured data signals on the root page", async () => {
    const element = await HomePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Parkgogogo");
    expect(html).toContain("parkgogogo.me");
    expect(html).toContain("Brand Signal");
    expect(html).toContain("rel=\"me noreferrer\"");
    expect(html).toContain("https://github.com/parkgogogo");
    expect(html).toContain("WebSite");
    expect(html).toContain("ProfilePage");
    expect(html).toContain("alternateName");
  });
});
