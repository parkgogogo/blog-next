import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");

describe("global theme tokens", () => {
  it("uses refined foreground contrast on pure white and pure black backgrounds", () => {
    const css = readFileSync(globalsCssPath, "utf8");

    expect(css).toContain("--background: #ffffff;");
    expect(css).toContain("--foreground: #3f3f46;");
    expect(css).toContain("--foreground-strong: #18181b;");
    expect(css).toContain("--text-muted: #71717a;");
    expect(css).toContain("--background: #000000;");
    expect(css).toContain("--foreground: #c4c4c8;");
    expect(css).toContain("--foreground-strong: #f5f5f5;");
    expect(css).toContain("--text-muted: #8f8f95;");
  });

  it("defines blog dark-mode tokens from the design guide", () => {
    const css = readFileSync(globalsCssPath, "utf8");

    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--background: #0d0d0d;");
    expect(css).toContain("--foreground: #b9b9b9;");
    expect(css).toContain("--border-default: #303030;");
    expect(css).toContain("--link-primary: #66b5ff;");
    expect(css).toContain("--codeblock-background: #131313;");
    expect(css).toContain(".dark .blog-doc-shell");
    expect(css).toContain('[data-theme="dark"] .blog-doc-shell');
    expect(css).toContain(".light .blog-doc-shell");
    expect(css).toContain('[data-theme="light"] .blog-doc-shell');
  });
});
