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
    getSlugs: vi.fn(async () => ["hello-world"]),
  },
}));

import BlogPostPage, { generateMetadata } from "./page";

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
    expect(html).toContain("text-[color:var(--foreground-strong)]");
    expect(html).toContain("text-[color:var(--text-muted)]");
  });

  it("keeps article tags close to the metadata and body", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("mb-4");
    expect(html).toContain("mt-3 flex flex-wrap gap-2");
    expect(html).not.toContain("md:mb-12");
    expect(html).not.toContain("md:mt-8");
  });

  it("renders raw markdown mode with the redesigned source panel", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world.md" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hello World.md");
    expect(html).toContain("# Hello World");
    expect(html).toContain("Rendered post");
    expect(html).toContain("Raw Markdown Source");
    expect(html).toContain(
      "border-[color:var(--border-default)] bg-[color:var(--surface-muted)]"
    );
  });

  it("includes canonical, rss, keywords, and category metadata for articles", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hello-world" }),
    });

    expect(metadata.alternates?.canonical).toBe("/blog/hello-world");
    expect(metadata.alternates?.types?.["application/rss+xml"]).toBe(
      "https://www.parkgogogo.me/rss/blog.xml"
    );
    expect(metadata.category).toBe("notes");
    expect(metadata.keywords).toEqual([
      "design",
      "notes",
      "Park",
      "博客",
    ]);
  });

  it("marks raw markdown mode as noindex while keeping the rendered canonical", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hello-world.md" }),
    });

    expect(metadata.alternates?.canonical).toBe("/blog/hello-world");
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    });
  });
});
