import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCssPath = path.resolve(process.cwd(), "src/app/globals.css");

describe("global theme tokens", () => {
  it("uses a pure white light background and pure black dark background", () => {
    const css = readFileSync(globalsCssPath, "utf8");

    expect(css).toContain("--background: #ffffff;");
    expect(css).toContain("--background: #000000;");
  });
});
