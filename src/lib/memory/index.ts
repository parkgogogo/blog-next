import { getSupabaseClient } from "@/lib/supabase";
import { optionalFiniteNumberSchema } from "@/lib/schemas/common";

export type MemoryFeedItem = {
  word_id: string;
  word_text: string;
  memory_score: number | string;
  exposure_count: number | string;
  success_count: number | string;
  fail_count: number | string;
  last_exposed_at: string | null;
  stability: number | string;
  priority: number | string;
};

export type MemoryEventPayload = {
  wordId: string;
  sessionId?: string | null;
  eventType: "exposure" | "open_card" | "mark_known" | "mark_unknown";
  deltaScore?: number | null;
  payload?: Record<string, unknown> | null;
  timezone?: string | null;
};

export type MemorySettings = {
  daily_target: number;
  weight_forget: number | string;
  weight_novelty: number | string;
  weight_backlog: number | string;
  weight_score: number | string;
  weight_difficulty: number | string;
  half_life_base: number | string;
  half_life_growth: number | string;
};

export const getMemorySettings = async (options?: { accessToken?: string | null }) => {
  const supabase = getSupabaseClient({ accessToken: options?.accessToken });
  const { data, error } = await supabase.rpc("get_memory_settings");

  if (error) {
    throw new Error(error.message);
  }

  const row = (data ?? [])[0] as MemorySettings | undefined;
  if (!row) {
    return {
      daily_target: 35,
      weight_forget: 1,
      weight_novelty: 1,
      weight_backlog: 1,
      weight_score: 1,
      weight_difficulty: 0.6,
      half_life_base: 3,
      half_life_growth: 0.3,
    } as MemorySettings;
  }

  return row;
};

export const getMemoryFeed = async (
  limit?: number,
  options?: { accessToken?: string | null },
) => {
  const parsedLimit = optionalFiniteNumberSchema.safeParse(limit);
  const limitValue = parsedLimit.success ? parsedLimit.data : undefined;
  const supabase = getSupabaseClient({ accessToken: options?.accessToken });
  const { data, error } = await supabase.rpc("get_memory_feed", {
    p_limit: limitValue ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MemoryFeedItem[];
};

export const applyMemoryEvent = async (
  payload: MemoryEventPayload,
  options?: { accessToken?: string | null },
) => {
  const supabase = getSupabaseClient({ accessToken: options?.accessToken });
  const { data, error } = await supabase.rpc("apply_memory_event", {
    p_word_id: payload.wordId,
    p_session_id: payload.sessionId ?? null,
    p_event_type: payload.eventType,
    p_delta_score: payload.deltaScore ?? null,
    p_payload: payload.payload ?? null,
    p_tz: payload.timezone ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0] as
    | (Record<string, unknown> & { out_word_id?: string; word_id?: string })
    | undefined;

  if (!row) return null;

  if (!row.word_id && row.out_word_id) {
    return { ...row, word_id: row.out_word_id };
  }

  return row;
};
