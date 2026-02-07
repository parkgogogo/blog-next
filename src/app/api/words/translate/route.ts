import { NextRequest, NextResponse } from "next/server";
import { AI_TEXT_BASE_URL, AI_TEXT_MODEL, AI_TEXT_TOKEN } from "@/lib/ai";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { SENTENCE_TRANSLATE_PROMPT } from "@/lib/words/constants";
import { translateSentence } from "@/lib/words/ai-service";
import { sentenceTranslationRequestSchema } from "@/lib/schemas/words";

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
    const baseUrl = AI_TEXT_BASE_URL;
    const token = AI_TEXT_TOKEN;

    if (!baseUrl || !token) {
      return NextResponse.json(
        {
          error:
            "AI_TEXT_BASE_URL or AI_TEXT_TOKEN is not configured (or fallback AI_BASE_URL and AI_TOKEN)",
        },
        { status: 500 },
      );
    }

    const upstream = await fetch(
      new URL("/v1/chat/completions", baseUrl).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: AI_TEXT_MODEL,
          stream: true,
          messages: [
            { role: "system", content: SENTENCE_TRANSLATE_PROMPT },
            {
              role: "user",
              content: `sentence: ${parsedPayload.data.text}`,
            },
          ],
        }),
      },
    );

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new NextResponse(errorText, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/plain",
        },
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const content = await translateSentence(parsedPayload.data.text, {
    force: parsedPayload.data.force,
  });
  return NextResponse.json({ type: "sentence_translation", content });
}
