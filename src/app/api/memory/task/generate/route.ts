import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { generateDailyTask } from "@/lib/memory/task";

type GeneratePayload = {
  date?: string;
  force?: boolean;
  targetWords?: number;
  maxExtraWords?: number;
  maxChars?: number;
  maxSentences?: number;
};

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: GeneratePayload = {};
  try {
    payload = (await request.json()) as GeneratePayload;
  } catch {
    payload = {};
  }

  try {
    const result = await generateDailyTask({
      date: payload.date,
      force: payload.force,
      targetWords: payload.targetWords,
      maxExtraWords: payload.maxExtraWords,
      maxChars: payload.maxChars,
      maxSentences: payload.maxSentences,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
