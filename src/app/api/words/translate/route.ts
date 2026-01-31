import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { translateSentence } from "@/lib/words/ai-service";
import { sentenceTranslationRequestSchema } from "@/lib/schemas/words";

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

  const parsedPayload = sentenceTranslationRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 },
    );
  }

  const content = await translateSentence(parsedPayload.data.text, {
    force: parsedPayload.data.force,
  });
  return NextResponse.json({ type: "sentence_translation", content });
}
