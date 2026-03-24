import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { insertWordEntry } from "@/lib/words/storage";
import { addWordEntryRequestSchema } from "@/lib/schemas/words";

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
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

  const parsedPayload = addWordEntryRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word and contextLine are required" },
      { status: 400 },
    );
  }

  const { word, contextLine, sourceLink, language, provider } =
    parsedPayload.data;
  const resolvedLanguage = language ?? "en";
  const resolvedProvider = provider ?? "manual";
  const escapedContextLine = escapeHtml(contextLine);

  const entry = await insertWordEntry(
    {
      word,
      language: resolvedLanguage,
      context: escapedContextLine,
      brief: "",
      detail: "",
      contextLine: escapedContextLine,
      sourceLink: sourceLink || null,
      provider: resolvedProvider,
      providerPayload: null,
    },
    { accessToken: auth.accessToken },
  );

  return NextResponse.json({
    type: "word_entry",
    id: entry.id,
    word,
    context: escapedContextLine,
  });
}
