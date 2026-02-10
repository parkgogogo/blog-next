import { NextRequest, NextResponse } from "next/server";
import { ai_streamText } from "@/lib/ai";
import { streamSseText } from "@/lib/ai/streaming";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { sentenceTranslationRequestSchema } from "@/lib/schemas/words";
import { createSseResponse } from "@/lib/sse/server";
import { SENTENCE_TRANSLATE_PROMPT } from "@/lib/words/constants";
import { translateSentence } from "@/lib/words/ai-service";

export async function POST(request: NextRequest) {
  const auth = await requireSupabaseAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.accessToken);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const streamRequested = payloadObject.stream === true;

  const parsedPayload = sentenceTranslationRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "text is required" },
      { status: 400 },
    );
  }

  if (streamRequested) {
    return createSseResponse({
      signal: request.signal,
      handler: async (writer) => {
        writer.meta({
          type: "sentence_translation",
        });

        const upstream = await ai_streamText({
          system: SENTENCE_TRANSLATE_PROMPT,
          prompt: `sentence: ${parsedPayload.data.text}`,
          signal: request.signal,
        });

        const text = await streamSseText({
          response: upstream,
          onDelta: (delta) => {
            writer.chunk({ delta });
          },
        });

        writer.done({
          text,
        });
      },
    });
  }

  const content = await translateSentence(parsedPayload.data.text, {
    force: parsedPayload.data.force,
  });
  return NextResponse.json({ type: "sentence_translation", content });
}
