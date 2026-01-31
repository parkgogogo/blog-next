import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getWordCardBundle } from "@/lib/words/ai-service";
import { getWordEntryStatus } from "@/lib/words/storage";
import { wordCardBundleRequestSchema } from "@/lib/schemas/words";

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedPayload = wordCardBundleRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word and sourceText are required" },
      { status: 400 },
    );
  }

  const { word, sourceText, maxChars, force } = parsedPayload.data;

  const content = await getWordCardBundle(word, sourceText, {
    force,
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
