import { NextRequest, NextResponse } from "next/server";
import { ai_streamText } from "@/lib/ai";
import { streamSseText } from "@/lib/ai/streaming";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { wordCardDailyV2RequestSchema } from "@/lib/schemas/words";
import { createSseResponse } from "@/lib/sse/server";
import {
  DailyContextNotFoundError,
  generateWordCardV2Content,
  prepareDailyWordCardV2,
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

  const parsedPayload = wordCardDailyV2RequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "wordId and mode are required" },
      { status: 400 },
    );
  }

  const { wordId, mode, force, maxChars } = parsedPayload.data;
  const streamRequested = parsedPayload.data.stream !== false;

  let prepared: Awaited<ReturnType<typeof prepareDailyWordCardV2>>;
  try {
    prepared = await prepareDailyWordCardV2({
      wordId,
      mode,
      maxChars,
      accessToken: auth.accessToken,
    });
  } catch (error) {
    if (error instanceof DailyContextNotFoundError) {
      return NextResponse.json(
        { error: "daily_context_not_found", code: "daily_context_not_found" },
        { status: 404 },
      );
    }
    throw error;
  }

  if (streamRequested) {
    return createSseResponse({
      signal: request.signal,
      handler: async (writer) => {
        const cached = await readWordCardV2Cache(prepared, { force });
        writer.meta({
          type: "word_card_daily_v2",
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
