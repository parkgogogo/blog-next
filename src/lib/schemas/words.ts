import { z } from "zod";
import type { ILuluWord } from "@/lib/words/types";
import {
  nonEmptyTrimmedStringSchema,
  optionalBooleanSchema,
  optionalFiniteNumberSchema,
  optionalNullableTrimmedStringSchema,
  optionalPositiveIntSchema,
  optionalTrimmedStringSchema,
} from "@/lib/schemas/common";

export const wordContextSchema = z
  .object({
    line: nonEmptyTrimmedStringSchema,
  })
  .passthrough();

export const wordInputSchema = z
  .object({
    uuid: nonEmptyTrimmedStringSchema,
    word: optionalTrimmedStringSchema,
    context: wordContextSchema,
    id: optionalTrimmedStringSchema,
    exp: optionalTrimmedStringSchema,
    addtime: optionalTrimmedStringSchema,
    phon: optionalTrimmedStringSchema,
  })
  .passthrough();

export const buildLuluWordFromInput = (payload: unknown): ILuluWord | null => {
  const parsed = wordInputSchema.safeParse(payload);
  if (!parsed.success) return null;

  const data = parsed.data;
  const uuid = data.uuid;
  const word = data.word && data.word.length > 0 ? data.word : uuid;

  return {
    id: data.id && data.id.length > 0 ? data.id : uuid,
    uuid,
    word,
    exp: data.exp ?? "",
    addtime: data.addtime ?? new Date(0).toISOString(),
    context: { line: data.context.line },
    phon: data.phon ?? "",
  };
};

export const storyWordCardRequestSchema = z
  .object({
    word: wordInputSchema,
    story: nonEmptyTrimmedStringSchema,
    force: optionalBooleanSchema,
  })
  .passthrough();

export const wordExplanationRequestSchema = z
  .object({
    word: wordInputSchema,
    force: optionalBooleanSchema,
  })
  .passthrough();

export const sentenceTranslationRequestSchema = z
  .object({
    text: nonEmptyTrimmedStringSchema,
    force: optionalBooleanSchema,
  })
  .passthrough();

export const contextSnippetRequestSchema = z
  .object({
    word: nonEmptyTrimmedStringSchema,
    sourceText: nonEmptyTrimmedStringSchema,
    maxChars: optionalFiniteNumberSchema,
    force: optionalBooleanSchema,
  })
  .passthrough();

export const wordCardBundleRequestSchema = z
  .object({
    word: nonEmptyTrimmedStringSchema,
    sourceText: nonEmptyTrimmedStringSchema,
    maxChars: optionalFiniteNumberSchema,
    force: optionalBooleanSchema,
  })
  .passthrough();

export const addWordEntryRequestSchema = z
  .object({
    word: nonEmptyTrimmedStringSchema,
    contextLine: nonEmptyTrimmedStringSchema,
    sourceLink: optionalTrimmedStringSchema,
    language: optionalTrimmedStringSchema,
    provider: optionalTrimmedStringSchema,
  })
  .passthrough();

export const syncPayloadSchema = z
  .object({
    provider: optionalTrimmedStringSchema,
    limit: optionalPositiveIntSchema,
  })
  .passthrough();

export const wordCardBundleContentSchema = z
  .object({
    context: optionalTrimmedStringSchema,
    brief: optionalTrimmedStringSchema,
    detail: optionalTrimmedStringSchema,
  })
  .transform((value) => ({
    context: value.context ?? "",
    brief: value.brief ?? "",
    detail: value.detail ?? "",
  }));

export const luluWordSchema = z
  .object({
    id: optionalTrimmedStringSchema,
    uuid: optionalTrimmedStringSchema,
    word: optionalTrimmedStringSchema,
    exp: optionalTrimmedStringSchema,
    addtime: optionalTrimmedStringSchema,
    context: z
      .object({
        line: optionalTrimmedStringSchema,
      })
      .optional(),
    html: optionalTrimmedStringSchema,
    phon: optionalTrimmedStringSchema,
    sourceLink: optionalNullableTrimmedStringSchema,
  })
  .passthrough()
  .transform((value) => ({
    id: value.id ?? "",
    uuid: value.uuid ?? "",
    word: value.word ?? "",
    exp: value.exp ?? "",
    addtime: value.addtime ?? "",
    context: { line: value.context?.line ?? "" },
    html: value.html ?? undefined,
    phon: value.phon ?? "",
    sourceLink: value.sourceLink ?? null,
  }));

export const luluResponseSchema = z
  .object({
    data: z.array(luluWordSchema),
  })
  .passthrough();

export const luluSummarySchema = z
  .object({
    recordsTotal: z.number(),
  })
  .passthrough();
