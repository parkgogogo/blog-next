import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { insertWordEntry } from "@/lib/words/storage";
import { addWordEntryRequestSchema } from "@/lib/schemas/words";

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

  const entry = await insertWordEntry({
    word,
    language: resolvedLanguage,
    context: contextLine,
    brief: "",
    detail: "",
    contextLine,
    sourceLink: sourceLink || null,
    provider: resolvedProvider,
    providerPayload: null,
  });

  return NextResponse.json({
    type: "word_entry",
    id: entry.id,
    word,
    context: contextLine,
  });
}
