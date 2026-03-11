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
});
