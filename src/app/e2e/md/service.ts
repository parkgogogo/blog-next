import { readFile } from "fs/promises";
import path from "path";

/**
 * 获取测试页面的 markdown 内容
 * @returns Promise<string> - e2e fixture markdown 的内容
 */
export async function fetchTestContent(): Promise<string> {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "app",
      "e2e",
      "md",
      "test-content.md"
    );

    const content = await readFile(filePath, "utf-8");

    return content;
  } catch (error) {
    console.error("Error fetching test content:", error);
    throw error;
  }
}
