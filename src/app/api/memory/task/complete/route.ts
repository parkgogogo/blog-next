import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { completeDailyTask, generateDailyTask } from "@/lib/memory/task";
import { addDays, format } from "date-fns";

type CompletePayload = {
  date?: string;
  generateNext?: boolean;
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

  let payload: CompletePayload = {};
  try {
    payload = (await request.json()) as CompletePayload;
  } catch {
    payload = {};
  }

  try {
    const task = await completeDailyTask(payload.date, {
      accessToken: auth.accessToken,
    });
    const shouldGenerateNext = payload.generateNext !== false;

    if (!shouldGenerateNext) {
      return NextResponse.json({ task, nextTask: null });
    }

    const baseDate = payload.date ? new Date(payload.date) : new Date();
    const nextDate = format(addDays(baseDate, 1), "yyyy-MM-dd");
    const nextTask = await generateDailyTask(
      { date: nextDate },
      { accessToken: auth.accessToken },
    );

    return NextResponse.json({ task, nextTask });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
