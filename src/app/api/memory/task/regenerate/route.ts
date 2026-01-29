import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { generateDailyTask } from "@/lib/memory/task";

type RegeneratePayload = {
  date?: string;
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

  let payload: RegeneratePayload = {};
  try {
    payload = (await request.json()) as RegeneratePayload;
  } catch {
    payload = {};
  }

  try {
    const result = await generateDailyTask({
      date: payload.date,
      force: true,
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
