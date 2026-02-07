import crypto from "crypto";
import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";

const TABLE_NAME = "ai_generations";

export type AIGenerationType =
  | "daily_story"
  | "explanation"
  | "free_explanation"
  | "word_page_explanation"
  | "word_card"
  | "free_word_card"
  | "context_snippet"
  | "word_card_bundle"
  | "passage_translation"
  | "sentence_translation"
  | "memory_sentence"
  | "memory_grouping"
  | "memory_cards";

const recordSchema = z.record(z.unknown());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  recordSchema.safeParse(value).success;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (!isRecord(value)) {
    return JSON.stringify(value);
  }

  const entries = Object.entries(value).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const serialized = entries.map(
    ([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`,
  );
  return `{${serialized.join(",")}}`;
};

export const createInputHash = (payload: unknown) => {
  const raw = stableStringify(payload);
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export const getCachedGeneration = async (
  type: AIGenerationType,
  inputHash: string,
) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("content")
    .eq("type", type)
    .eq("input_hash", inputHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.content ?? null;
};

export const saveGeneration = async (options: {
  type: AIGenerationType;
  key: string;
  inputHash: string;
  content: string;
  meta?: Record<string, unknown>;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      type: options.type,
      key: options.key,
      input_hash: options.inputHash,
      content: options.content,
      meta: options.meta ?? {},
    },
    {
      onConflict: "type,key",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
};
