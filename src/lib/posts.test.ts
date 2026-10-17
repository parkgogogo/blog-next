import { describe, expect, it } from "vitest";
import {
  extractLeadingHashtags,
  firstParagraph,
  parsePost,
  parseTranslation,
  TRANSLATION_FILE,
} from "@/lib/posts";
import { blogPostPath, postLanguageAlternates, postVersions } from "@/lib/seo";

describe("extractLeadingHashtags", () => {
  it("moves a leading hashtag line into tags", () => {
    const result = extractLeadingHashtags("\n#frontend #webkit #pitfall\n\n## Title\n\nBody");

    expect(result.tags).toEqual(["frontend", "webkit", "pitfall"]);
    expect(result.content).toBe("## Title\n\nBody");
  });

  it("leaves headings and normal text alone", () => {
    expect(extractLeadingHashtags("# Heading\n\nBody").tags).toEqual([]);
    expect(extractLeadingHashtags("Text with #tag inside").tags).toEqual([]);
  });
});

describe("firstParagraph", () => {
  it("skips headings, images, code and lists", () => {
    const markdown = [
      "## Heading",
      "![image](/a.png)",
      "```ts\nconst a = 1;\n```",
      "- list item",
      "First **real** paragraph with a [link](https://example.com).",
      "Second paragraph.",
    ].join("\n\n");

    expect(firstParagraph(markdown)).toBe("First real paragraph with a link.");
  });
});

describe("parsePost", () => {
  it("reads the extended frontmatter fields", () => {
    const post = parsePost(
      [
        "---",
        'title: "Eval"',
        'date: "2026-10-01"',
        'subtitle: "Sub"',
        'cover: "/cover.png"',
        'authors: ["A", "B"]',
        "links:",
        '  - label: "Paper"',
        '    href: "https://arxiv.org"',
        'tags: ["x"]',
        "---",
        "#y",
        "",
        "Body text.",
      ].join("\n"),
      "eval",
      "posts/Research"
    );

    expect(post).toMatchObject({
      title: "Eval",
      date: "2026-10-01T00:00:00.000Z",
      subtitle: "Sub",
      cover: "/cover.png",
      authors: ["A", "B"],
      links: [{ label: "Paper", href: "https://arxiv.org" }],
      tags: ["x", "y"],
      category: "Research",
      excerpt: "Body text.",
      content: "Body text.",
    });
  });

  it("uses the fallback date when frontmatter has none", () => {
    const post = parsePost("Body", "a", "posts/Notes", "2025-01-02T00:00:00.000Z");
    expect(post.date).toBe("2025-01-02T00:00:00.000Z");
  });
});

describe("translations", () => {
  const original = parsePost(
    [
      "---",
      'title: "评测"',
      'date: "2026-10-01"',
      'tags: ["AI"]',
      'cover: "https://img/cover.webp"',
      "---",
      "中文正文。",
    ].join("\n"),
    "eval",
    "docs/分享"
  );

  it("defaults the original language to zh and reads lang from frontmatter", () => {
    expect(original.lang).toBe("zh");
    expect(parsePost('---\nlang: "en"\n---\nBody', "a", "docs/x").lang).toBe("en");
    expect(parsePost('---\nlang: "fr"\n---\nBody', "a", "docs/x").lang).toBe("zh");
  });

  it("matches only <slug>.<zh|en|ja>.md as translation files", () => {
    expect("eval.en.md".match(TRANSLATION_FILE)?.slice(1)).toEqual(["eval", "en"]);
    expect("Agent-Harness：模型.ja.md".match(TRANSLATION_FILE)?.slice(1)).toEqual(["Agent-Harness：模型", "ja"]);
    expect(TRANSLATION_FILE.test("eval.md")).toBe(false);
    expect(TRANSLATION_FILE.test("eval.fr.md")).toBe(false);
  });

  it("keeps translated text and inherits date, tags, category and cover", () => {
    const en = parseTranslation(
      '---\ntitle: "Eval"\nexcerpt: "English summary."\n---\nEnglish body.',
      original,
      "en"
    );

    expect(en).toMatchObject({
      slug: "eval",
      lang: "en",
      title: "Eval",
      excerpt: "English summary.",
      content: "English body.",
      date: original.date,
      tags: ["AI"],
      category: "分享",
      cover: "https://img/cover.webp",
    });
  });

  it("falls back to the original title when a translation has none", () => {
    expect(parseTranslation("本文。", original, "ja").title).toBe("评测");
  });

  it("lists versions in zh/en/ja order with the original at /blog/<slug>", () => {
    const withTranslations = {
      ...original,
      translations: {
        ja: parseTranslation('---\ntitle: "評価"\n---\n本文。', original, "ja"),
        en: parseTranslation('---\ntitle: "Eval"\n---\nBody.', original, "en"),
      },
    };

    expect(postVersions(withTranslations).map((v) => [v.lang, v.path])).toEqual([
      ["zh", "/blog/eval"],
      ["en", "/blog/eval/en"],
      ["ja", "/blog/eval/ja"],
    ]);
    expect(postLanguageAlternates(withTranslations)).toEqual({
      "zh-CN": "https://www.parkgogogo.me/blog/eval",
      en: "https://www.parkgogogo.me/blog/eval/en",
      ja: "https://www.parkgogogo.me/blog/eval/ja",
      "x-default": "https://www.parkgogogo.me/blog/eval",
    });
    expect(postLanguageAlternates(original)).toBeUndefined();
    expect(blogPostPath("新疆", "ja")).toBe("/blog/%E6%96%B0%E7%96%86/ja");
  });
});
