import { NextRequest, NextResponse } from "next/server";
import type { WordCardBundleRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getWordCardBundle } from "@/lib/words/ai-service";
import { getWordEntryStatus } from "@/lib/words/storage";

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

  const content = await getWordCardBundle(word, sourceText, {
    force: payload.force,
    maxChars,
  });
  const contextLine = content.context || sourceText;
  const status = await getWordEntryStatus(word, contextLine);

  return NextResponse.json({
    type: "word_card_bundle",
    status,
    context: contextLine,
    brief: content.brief,
    detail: content.detail,
  });
}
