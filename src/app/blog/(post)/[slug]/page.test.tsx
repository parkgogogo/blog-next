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
    getSlugs: vi.fn(async () => ["hello-world"]),
    getAllPosts: vi.fn(async () => [
      {
        slug: "hello-world",
        title: "Hello World",
        date: "2026-03-01T00:00:00.000Z",
        content: "Markdown body",
        tags: ["design"],
        readingTime: 6,
        category: "notes",
        categoryPath: "notes",
      },
    ]),
    getRawMarkdownBySlug: vi.fn(async () => "# Hello World"),
  },
}));

import BlogPostPage from "./page";

describe("BlogPostPage", () => {
  it("uses softer body text with stronger title contrast on article pages", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hello World");
    expect(html).toContain("max-w-[650px]");
    expect(html).toContain("text-[color:var(--foreground-strong)]");
    expect(html).toContain("text-[color:var(--text-muted)]");
    expect(html).toContain(
      "border-[color:var(--border-subtle)] bg-[color:var(--background)] text-[color:var(--text-muted)]"
    );
  });
});
