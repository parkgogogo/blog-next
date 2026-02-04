import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { getWordCardBundle, translateSentence } from "@/lib/words/ai-service";
import { getWordEntryStatus } from "@/lib/words/storage";
import { wordCardBundleRequestSchema } from "@/lib/schemas/words";
import { getSupabaseClient } from "@/lib/supabase";

const normalizeContextLine = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const loadContextLinesForWord = async (word: string, accessToken: string) => {
  const supabase = getSupabaseClient({ accessToken });
  const { data: wordRow, error: wordError } = await supabase
    .from("words")
    .select("id")
    .eq("text", word)
    .maybeSingle();

  if (wordError) {
    throw new Error(wordError.message);
  }

  if (!wordRow?.id) return [];

  const { data: entries, error: entriesError } = await supabase
    .from("word_entries")
    .select("context_line, source_text, context")
    .eq("word_id", wordRow.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const entry of entries ?? []) {
    const contextLine =
      normalizeContextLine(entry.context_line) ||
      normalizeContextLine(entry.source_text) ||
      normalizeContextLine(entry.context);
    if (!contextLine || seen.has(contextLine)) continue;
    seen.add(contextLine);
    lines.push(contextLine);
    if (lines.length >= 3) break;
  }

  return lines;
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

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedPayload = wordCardBundleRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word and sourceText are required" },
      { status: 400 },
    );
  }

  const { word, sourceText, maxChars, force } = parsedPayload.data;

  const contextLines = await loadContextLinesForWord(word, auth.accessToken);
  const contextTranslations =
    contextLines.length > 0
      ? await Promise.all(
          contextLines.map((line) => translateSentence(line)),
        )
      : [];

  const content = await getWordCardBundle(word, sourceText, {
    force,
    maxChars,
    contextLines,
    contextTranslations,
  });
  const contextLine = content.context || sourceText;
  const status = await getWordEntryStatus(word, contextLine, {
    accessToken: auth.accessToken,
  });

  return NextResponse.json({
    type: "word_card_bundle",
    status,
    context: contextLine,
    brief: content.brief,
    detail: content.detail,
  });
}
