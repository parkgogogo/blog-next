import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BlogPost } from "@/types/blog";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/components/PostArticle", () => ({
  default: ({ post }: { post: BlogPost }) => (
    <article data-testid="post-article">{post.title}</article>
  ),
}));

const { helloWorld } = vi.hoisted(() => ({
  helloWorld: {
    slug: "hello-world",
    title: "Hello World",
    date: "2026-03-01T00:00:00.000Z",
    content: "Markdown body",
    tags: ["design"],
    readingTime: 6,
    category: "notes",
    categoryPath: "notes",
  } satisfies BlogPost,
}));

vi.mock("@/lib/posts", () => ({
  PostService: {
    getPostBySlug: vi.fn(async (slug: string) => (slug === "hello-world" ? helloWorld : null)),
    getRawMarkdownBySlug: vi.fn(async () => "# Hello World"),
    getSlugs: vi.fn(async () => ["hello-world"]),
    getAllPosts: vi.fn(async () => [
      helloWorld,
      { ...helloWorld, slug: "second", title: "Second" },
    ]),
  },
}));

import BlogPostPage, { generateMetadata } from "./page";

describe("BlogPostPage", () => {
  it("renders the article with structured data", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-testid="post-article"');
    expect(html).toContain("BlogPosting");
  });

  it("renders raw markdown mode with a link back to the rendered post", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "hello-world.md" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hello World.md");
    expect(html).toContain("# Hello World");
    expect(html).toContain('href="/blog/hello-world"');
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
    expect(metadata.keywords).toEqual(["design", "notes", "Park", "博客"]);
  });

  it("marks raw markdown mode as noindex while keeping the rendered canonical", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hello-world.md" }),
    });

    expect(metadata.alternates?.canonical).toBe("/blog/hello-world");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
