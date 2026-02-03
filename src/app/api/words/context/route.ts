import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireSupabaseAuth } from "@/lib/middleware/security";
import { getContextSnippet } from "@/lib/words/ai-service";
import { contextSnippetRequestSchema } from "@/lib/schemas/words";

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

  const parsedPayload = contextSnippetRequestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "word and sourceText are required" },
      { status: 400 },
    );
  }

  const { word, sourceText, maxChars, force } = parsedPayload.data;
  const content = await getContextSnippet(word, sourceText, {
    force,
    maxChars,
  });

  return NextResponse.json({ type: "context_snippet", content });
}
