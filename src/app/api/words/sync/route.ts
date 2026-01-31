import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getLuluWords } from "@/lib/words/lulu";
import { insertWordEntry } from "@/lib/words/storage";
import { getSupabaseClient } from "@/lib/supabase";
import { syncPayloadSchema } from "@/lib/schemas/words";
import { optionalTrimmedStringSchema } from "@/lib/schemas/common";

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const normalizeWord = (value: unknown) => {
  const parsed = optionalTrimmedStringSchema.safeParse(value);
  if (!parsed.success || !parsed.data) return "";
  return stripHtml(parsed.data);
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

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsedPayload = syncPayloadSchema.safeParse(payload);
  const data = parsedPayload.success ? parsedPayload.data : {};
  const provider = data.provider ?? "lulu";
  if (provider !== "lulu") {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data: job, error: jobError } = await supabase
    .from("word_sync_jobs")
    .insert({
      provider,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  const jobId = job?.id as string | undefined;

  try {
    const allWords = await getLuluWords();
    const limit = data.limit;
    const words = limit ? allWords.slice(0, limit) : allWords;

    const { data: existing, error: existingError } = await supabase
      .from("word_entries")
      .select("provider_payload")
      .eq("provider", provider);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingUuids = new Set<string>();
    for (const row of existing ?? []) {
      const payload = row.provider_payload as { uuid?: string } | null;
      if (payload?.uuid) existingUuids.add(payload.uuid);
    }

    let inserted = 0;
    let skipped = 0;

    for (const entry of words) {
      if (entry.uuid && existingUuids.has(entry.uuid)) {
        skipped += 1;
        continue;
      }

      const wordText =
        normalizeWord(entry.word) || normalizeWord(entry.uuid) || "";
      const contextLine = normalizeWord(entry.context?.line);
      if (!wordText || !contextLine) {
        skipped += 1;
        continue;
      }

      await insertWordEntry({
        word: wordText,
        language: "en",
        context: contextLine,
        brief: "",
        detail: "",
        sourceText: contextLine,
        contextLine,
        provider,
        providerPayload: {
          id: entry.id,
          uuid: entry.uuid,
          exp: entry.exp,
          addtime: entry.addtime,
          phon: entry.phon,
        },
        createdAt: entry.addtime,
      });
      inserted += 1;
    }

    await supabase
      .from("word_sync_jobs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      type: "word_sync",
      jobId,
      inserted,
      skipped,
      total: words.length,
    });
  } catch (error) {
    await supabase
      .from("word_sync_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", jobId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
