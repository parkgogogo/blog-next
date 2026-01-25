import { NextRequest, NextResponse } from "next/server";
import type { ContextSnippetRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getContextSnippet } from "@/lib/words/ai-service";

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: Partial<ContextSnippetRequest>;
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const word = typeof payload.word === "string" ? payload.word.trim() : "";
  const sourceText =
    typeof payload.sourceText === "string" ? payload.sourceText.trim() : "";
  const maxChars =
    typeof payload.maxChars === "number" ? payload.maxChars : undefined;

  if (!word || !sourceText) {
    return NextResponse.json(
      { error: "word and sourceText are required" },
      { status: 400 },
    );
  }

  const content = await getContextSnippet(word, sourceText, {
    force: payload.force,
    maxChars,
  });

  return NextResponse.json({ type: "context_snippet", content });
}
