import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import BlogPostLayout from "@/components/BlogPostLayout";
import type { Category } from "@/types/blog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/blog/llm-chains-best-practices",
}));

const categories: Category = {
  name: "Documentation",
  path: "documentation",
  posts: [],
  subcategories: [],
};

describe("BlogPostLayout", () => {
  it("renders article detail pages without sidebar or on-page navigation chrome", () => {
    const html = renderToStaticMarkup(
      <BlogPostLayout categories={categories}>
        <main>Article body</main>
      </BlogPostLayout>
    );

    expect(html).toContain("Article body");
    expect(html).not.toContain("Documentation");
    expect(html).not.toContain("ON THIS PAGE");
    expect(html).not.toContain('title="Menu"');
  });
});
