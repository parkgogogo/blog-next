import { NextRequest, NextResponse } from "next/server";
import { AI_TEXT_BASE_URL, AI_TEXT_MODEL, AI_TEXT_TOKEN } from "@/lib/ai";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { SENTENCE_TRANSLATE_PROMPT } from "@/lib/words/constants";
import { translateSentence } from "@/lib/words/ai-service";
import { sentenceTranslationRequestSchema } from "@/lib/schemas/words";

const buildUpstreamUrl = (baseUrl: string) => {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("chat/completions", normalized).toString();
};

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
  console.log("[words/translate] request mode", {
    streamRequested,
    hasText: typeof payloadObject.text === "string" && payloadObject.text.length > 0,
  });

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

    const upstream = await fetch(buildUpstreamUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
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
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new NextResponse(errorText, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/plain",
        },
      });
    }
    const upstreamContentType = upstream.headers.get("content-type") || "";
    if (!upstreamContentType.includes("text/event-stream")) {
      const body = await upstream.text();
      console.log("[words/translate] upstream returned non-stream body", {
        contentType: upstreamContentType,
        preview: body.slice(0, 300),
      });
      return NextResponse.json(
        {
          error: "Upstream did not return event-stream",
          contentType: upstreamContentType,
        },
        { status: 502 },
      );
    }
    console.log("[words/translate] upstream stream ready", {
      status: upstream.status,
      contentType: upstreamContentType,
    });

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
