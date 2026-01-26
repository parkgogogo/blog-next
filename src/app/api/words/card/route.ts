import { NextRequest, NextResponse } from "next/server";
import type { WordCardBundleRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getWordCardBundle } from "@/lib/words/ai-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

const withCors = (response: NextResponse) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return withCors(auth.response);
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return withCors(rateLimit.response);
  }

  let payload: Partial<WordCardBundleRequest>;
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    );
  }

  const word = typeof payload.word === "string" ? payload.word.trim() : "";
  const sourceText =
    typeof payload.sourceText === "string" ? payload.sourceText.trim() : "";
  const contextLine =
    typeof payload.contextLine === "string" ? payload.contextLine.trim() : "";
  const source = sourceText || contextLine;
  const maxChars =
    typeof payload.maxChars === "number" ? payload.maxChars : undefined;

  if (!word || !source) {
    return withCors(
      NextResponse.json(
        { error: "word and sourceText/contextLine are required" },
        { status: 400 },
      ),
    );
  }

  const content = await getWordCardBundle(word, source, {
    force: payload.force,
    maxChars,
  });

  return withCors(
    NextResponse.json({
      type: "word_card_bundle",
      context: content.context,
      brief: content.brief,
      detail: content.detail,
    }),
  );
}
