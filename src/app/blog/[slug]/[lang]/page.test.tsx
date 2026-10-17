import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BlogPost } from "@/types/blog";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/components/PostArticle", () => ({
  default: ({
    post,
    versions,
  }: {
    post: BlogPost;
    versions?: { lang: string; href: string; current: boolean }[];
  }) => (
    <article
      data-lang={post.lang}
      data-versions={versions?.map((v) => `${v.lang}:${v.href}:${v.current}`).join(",")}
    >
      {post.title}
    </article>
  ),
}));

const { original } = vi.hoisted(() => {
  const base = {
    slug: "eval",
    title: "评测",
    date: "2026-10-01T00:00:00.000Z",
    content: "中文",
    category: "分享",
    categoryPath: "docs/分享",
    lang: "zh",
  } satisfies BlogPost;

  return {
    original: {
      ...base,
      translations: {
        en: { ...base, lang: "en", title: "Eval", content: "English", rawMarkdown: "# English" },
      },
    } satisfies BlogPost,
  };
});

vi.mock("@/lib/posts", () => ({
  PostService: {
    getPostBySlug: vi.fn(async (slug: string) => (slug === "eval" ? original : null)),
    getTranslationParams: vi.fn(async () => [{ slug: "eval", lang: "en" }]),
  },
}));

import BlogPostTranslationPage, { generateMetadata, generateStaticParams } from "./page";

const params = (slug: string, lang: string) => ({ params: Promise.resolve({ slug, lang }) });

describe("BlogPostTranslationPage", () => {
  it("statically generates one page per translation", async () => {
    expect(await generateStaticParams()).toEqual([{ slug: "eval", lang: "en" }]);
  });

  it("renders the translation with a language switcher and translation JSON-LD", async () => {
    const html = renderToStaticMarkup(await BlogPostTranslationPage(params("eval", "en")));

    expect(html).toContain('data-lang="en"');
    expect(html).toContain('data-versions="zh:/blog/eval:false,en:/blog/eval/en:true"');
    expect(html).toContain('"inLanguage":"en"');
    expect(html).toContain('"translationOfWork":{"@id":"https://www.parkgogogo.me/blog/eval"}');
  });

  it("uses its own canonical and declares every language version", async () => {
    const metadata = await generateMetadata(params("eval", "en"));

    expect(metadata.title).toBe("Eval");
    expect(metadata.alternates?.canonical).toBe("/blog/eval/en");
    expect(metadata.alternates?.languages).toEqual({
      "zh-CN": "https://www.parkgogogo.me/blog/eval",
      en: "https://www.parkgogogo.me/blog/eval/en",
      "x-default": "https://www.parkgogogo.me/blog/eval",
    });
    expect(metadata.openGraph).toMatchObject({ locale: "en_US" });
  });

  it("serves the translation source at /blog/<slug>/<lang>.md", async () => {
    const html = renderToStaticMarkup(await BlogPostTranslationPage(params("eval", "en.md")));

    expect(html).toContain("Eval.md");
    expect(html).toContain("# English");
    expect(html).toContain('href="/blog/eval/en"');
  });

  it("404s for the original language, missing translations and unknown languages", async () => {
    await expect(BlogPostTranslationPage(params("eval", "zh"))).rejects.toThrow("notFound");
    await expect(BlogPostTranslationPage(params("eval", "ja"))).rejects.toThrow("notFound");
    await expect(BlogPostTranslationPage(params("eval", "fr"))).rejects.toThrow("notFound");
    await expect(BlogPostTranslationPage(params("missing", "en"))).rejects.toThrow("notFound");
  });
});
