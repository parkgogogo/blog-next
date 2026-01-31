"use server";

import { applyMemoryEvent } from "@/lib/memory";
import { completeDailyTask } from "@/lib/memory/task";
import { getWordCardBundle } from "@/lib/words/ai-service";

type DailyMemoryEventType = "exposure" | "open_card" | "mark_known";

export const recordMemoryEventAction = async (payload: {
  wordId: string;
  eventType: DailyMemoryEventType;
  deltaScore?: number | null;
  meta?: Record<string, unknown> | null;
}) => {
  return applyMemoryEvent({
    wordId: payload.wordId,
    eventType: payload.eventType,
    deltaScore: payload.deltaScore ?? null,
    payload: payload.meta ?? null,
  });
};

export const completeDailyTaskAction = async (date: string) => {
  return completeDailyTask(date);
};

export const getDailyWordBundleAction = async (payload: {
  word: string;
  sourceText: string;
  force?: boolean;
  maxChars?: number;
}) => {
  return getWordCardBundle(payload.word, payload.sourceText, {
    force: payload.force,
    maxChars: payload.maxChars,
  });
};
