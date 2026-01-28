import { NextRequest, NextResponse } from "next/server";
import type { AddWordEntryRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { insertWordEntry } from "@/lib/words/storage";

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: Partial<AddWordEntryRequest>;
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const word = typeof payload.word === "string" ? payload.word.trim() : "";
  const contextLine =
    typeof payload.contextLine === "string" ? payload.contextLine.trim() : "";
  const sourceLink =
    typeof payload.sourceLink === "string" ? payload.sourceLink.trim() : "";
  const language =
    typeof payload.language === "string" ? payload.language.trim() : "en";
  const provider =
    typeof payload.provider === "string" ? payload.provider.trim() : "manual";

  if (!word || !contextLine) {
    return NextResponse.json(
      { error: "word and contextLine are required" },
      { status: 400 },
    );
  }

  const entry = await insertWordEntry({
    word,
    language,
    context: contextLine,
    brief: "",
    detail: "",
    contextLine,
    sourceLink: sourceLink || null,
    provider,
    providerPayload: null,
  });

  return NextResponse.json({
    type: "word_entry",
    id: entry.id,
    word,
    context: contextLine,
  });
}
