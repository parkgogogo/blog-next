import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getWordsPageExplanation } from "@/lib/words/ai-service";
import {
  buildLuluWordFromInput,
  wordExplanationRequestSchema,
} from "@/lib/schemas/words";

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

  const parsedPayload = wordExplanationRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word(uuid, context.line) is required" },
      { status: 400 },
    );
  }

  const word = buildLuluWordFromInput(parsedPayload.data.word);
  if (!word) {
    return NextResponse.json(
      { error: "word(uuid, context.line) is required" },
      { status: 400 },
    );
  }

  const content = await getWordsPageExplanation(word, {
    force: parsedPayload.data.force,
  });

  return NextResponse.json({ type: "word_page_explanation", content });
}
