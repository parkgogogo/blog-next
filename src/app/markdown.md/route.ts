import { readMarkdownTestContent } from "@/lib/markdown/test-content";

export const dynamic = "force-static";

export async function GET() {
  return new Response(await readMarkdownTestContent(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
