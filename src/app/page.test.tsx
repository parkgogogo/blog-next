import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

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

  it("keeps the homepage h1 limited to the brand name", async () => {
    const element = await HomePage();
    const html = renderToStaticMarkup(element);
    const headings = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? [];

    expect(headings).toHaveLength(1);
    expect((headings[0] ?? "").replace(/<[^>]+>/g, "").trim()).toBe("ParkGoGoGo");
  });
});
