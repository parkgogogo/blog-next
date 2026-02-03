import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { getStoryWordCard } from "@/lib/words/ai-service";
import {
  buildLuluWordFromInput,
  storyWordCardRequestSchema,
} from "@/lib/schemas/words";

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

  const parsedPayload = storyWordCardRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word(uuid, context.line) and story are required" },
      { status: 400 },
    );
  }

  const word = buildLuluWordFromInput(parsedPayload.data.word);
  const story = parsedPayload.data.story;

  if (!word) {
    return NextResponse.json(
      { error: "word(uuid, context.line) and story are required" },
      { status: 400 },
    );
  }

  const content = await getStoryWordCard(word, story, {
    force: parsedPayload.data.force,
  });

  return NextResponse.json({ type: "word_card", content });
}
