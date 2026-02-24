import { NextRequest, NextResponse } from "next/server";
import { ai_streamText } from "@/lib/ai";
import { streamSseText } from "@/lib/ai/streaming";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { wordCardPluginV2RequestSchema } from "@/lib/schemas/words";
import { createSseResponse } from "@/lib/sse/server";
import {
  generateWordCardV2Content,
  preparePluginWordCardV2,
  readWordCardV2Cache,
  saveWordCardV2Cache,
  toWordCardV2Response,
} from "@/lib/words/card-v2-service";
import { WORD_CARD_V2_PROMPT } from "@/lib/words/constants";

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

  const parsedPayload = wordCardPluginV2RequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word, sourceSentence, mode are required" },
      { status: 400 },
    );
  }

  const { word, sourceSentence, mode, force, maxChars } = parsedPayload.data;
  const streamRequested = parsedPayload.data.stream !== false;

  const prepared = await preparePluginWordCardV2({
    word,
    sourceSentence,
    mode,
    maxChars,
    accessToken: auth.accessToken,
  });

  if (streamRequested) {
    return createSseResponse({
      signal: request.signal,
      handler: async (writer) => {
        const cached = await readWordCardV2Cache(prepared, { force });
        writer.meta({
          type: "word_card_plugin_v2",
          scenario: prepared.scenario,
          mode: prepared.mode,
          word: prepared.word,
          primaryContext: prepared.primaryContext,
          historyContextStatus: prepared.historyContextStatus,
          historyContexts: prepared.historyContexts,
          cached: Boolean(cached),
        });

        if (cached) {
          writer.chunk({ delta: cached });
          writer.done({ cached: true });
          return;
        }

        const upstream = await ai_streamText({
          system: WORD_CARD_V2_PROMPT,
          prompt: prepared.prompt,
          signal: request.signal,
        });

        const content = await streamSseText({
          response: upstream,
          onDelta: (delta) => {
            writer.chunk({ delta });
          },
        });

        await saveWordCardV2Cache(prepared, content);
        writer.done({ cached: false });
      },
    });
  }

  const result = await generateWordCardV2Content(prepared, { force });
  return NextResponse.json(toWordCardV2Response(prepared, result.content, result.cached));
}
