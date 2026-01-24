import { NextRequest, NextResponse } from "next/server";
import type { ILuluWord } from "@/lib/words/types";
import type { StoryWordCardRequest } from "@/lib/words/api-types";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";
import { getStoryWordCard } from "@/lib/words/ai-service";

const buildWord = (payload: unknown): ILuluWord | null => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Partial<ILuluWord> & {
    context?: { line?: string };
  };
  const uuid = typeof data.uuid === "string" ? data.uuid.trim() : "";
  const word = typeof data.word === "string" ? data.word.trim() : "";
  const contextLine =
    typeof data.context?.line === "string" ? data.context.line.trim() : "";

  if (!uuid || !contextLine) return null;

  return {
    id: data.id || uuid,
    uuid,
    word: word || uuid,
    exp: data.exp || "",
    addtime: data.addtime || new Date(0).toISOString(),
    context: { line: contextLine },
    phon: data.phon || "",
  };
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

  let payload: Partial<StoryWordCardRequest> & {
    word?: unknown;
    story?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const word = buildWord(payload.word);
  const story = typeof payload.story === "string" ? payload.story.trim() : "";

  if (!word || !story) {
    return NextResponse.json(
      { error: "word(uuid, context.line) and story are required" },
      { status: 400 },
    );
  }

  const content = await getStoryWordCard(word, story, {
    force: payload.force,
  });

  return NextResponse.json({ type: "word_card", content });
}
