import { describe, expect, it } from "vitest";
import { extractLeadingHashtags, firstParagraph, parsePost } from "@/lib/posts";

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
