import { NextRequest, NextResponse } from "next/server";
import type { WordCardBundleRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getWordCardBundle } from "@/lib/words/ai-service";

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: Partial<WordCardBundleRequest>;
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const word = typeof payload.word === "string" ? payload.word.trim() : "";
  const story =
    typeof payload.story === "string" ? payload.story.trim() : "";
  const contextLine =
    typeof payload.contextLine === "string" ? payload.contextLine.trim() : "";
  const source = story || contextLine;
  const maxChars =
    typeof payload.maxChars === "number" ? payload.maxChars : undefined;

  if (!word || !source) {
    return NextResponse.json(
      { error: "word and story/contextLine are required" },
      { status: 400 },
    );
  }

  const content = await getWordCardBundle(word, source, {
    force: payload.force,
    maxChars,
  });

  return NextResponse.json({
    type: "word_card_bundle",
    context: content.context,
    brief: content.brief,
    detail: content.detail,
  });
}
