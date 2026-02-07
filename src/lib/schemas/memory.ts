import { z } from "zod";
import {
  nonEmptyTrimmedStringSchema,
  optionalBooleanSchema,
  optionalFiniteNumberSchema,
  optionalNonNegativeIntSchema,
  optionalNullableTrimmedStringSchema,
  optionalPositiveIntSchema,
} from "@/lib/schemas/common";

export const memoryEventTypeSchema = z.enum([
  "exposure",
  "open_card",
  "mark_known",
  "mark_unknown",
]);

const trimmedEventTypeSchema = z.preprocess((value) => {
  const parsed = z.string().safeParse(value);
  return parsed.success ? parsed.data.trim() : value;
}, memoryEventTypeSchema);

export const memoryEventRequestSchema = z
  .object({
    wordId: nonEmptyTrimmedStringSchema,
    sessionId: optionalNullableTrimmedStringSchema,
    eventType: trimmedEventTypeSchema,
    deltaScore: optionalFiniteNumberSchema,
    timezone: optionalNullableTrimmedStringSchema,
    payload: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();

export const startSessionPayloadSchema = z
  .object({
    limit: optionalPositiveIntSchema,
    groupSize: optionalPositiveIntSchema,
    timezone: optionalNullableTrimmedStringSchema,
    params: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();

export const completeSessionPayloadSchema = z
  .object({
    sessionId: optionalNullableTrimmedStringSchema,
    timezone: optionalNullableTrimmedStringSchema,
  })
  .passthrough();

export const dailyTaskOptionsSchema = z
  .object({
    date: nonEmptyTrimmedStringSchema.optional(),
    force: optionalBooleanSchema,
    targetWords: optionalPositiveIntSchema,
    maxExtraWords: optionalNonNegativeIntSchema,
    maxChars: optionalPositiveIntSchema,
    maxSentences: optionalPositiveIntSchema,
  })
  .passthrough();

export const memoryCardSchema = z
  .object({
    words: z.array(nonEmptyTrimmedStringSchema).min(1).max(3),
    sentence: nonEmptyTrimmedStringSchema,
  })
  .passthrough();

export const memoryCardsContentSchema = z
  .object({
    cards: z.array(memoryCardSchema).min(1),
  })
  .passthrough();
