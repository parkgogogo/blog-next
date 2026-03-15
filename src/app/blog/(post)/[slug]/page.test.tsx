import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/components/MarkdownRenderer", () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

vi.mock("@/lib/posts", () => ({
  PostService: {
    getPostBySlug: vi.fn(async (slug: string) =>
      slug === "hello-world"
        ? {
        slug: "hello-world",
        title: "Hello World",
        date: "2026-03-01T00:00:00.000Z",
        content: "Markdown body",
        tags: ["design"],
        readingTime: 6,
        category: "notes",
        categoryPath: "notes",
      }
        : null
    ),
    getRawMarkdownBySlug: vi.fn(async () => "# Hello World"),
  },
}));

import BlogPostPage from "./page";

describe("BlogPostPage", () => {
  it("renders article metadata and markdown content", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hello World");
    expect(html).toContain("1 Mar, 2026");
    expect(html).toContain("6 min read");
    expect(html).toContain("data-testid=\"markdown-renderer\"");
  });

  it("renders raw markdown mode without re-fetching the post list", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world.md" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hello World.md");
    expect(html).toContain("# Hello World");
  });
});
