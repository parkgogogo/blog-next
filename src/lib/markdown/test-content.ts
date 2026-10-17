import { readFile } from "node:fs/promises";
import path from "node:path";

export const MARKDOWN_TEST_FILE = path.join(process.cwd(), "src/content/markdown-test.md");

export function readMarkdownTestContent(): Promise<string> {
  return readFile(MARKDOWN_TEST_FILE, "utf8");
}
