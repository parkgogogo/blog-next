import { NextRequest, NextResponse } from "next/server";
import { ai_generateSpeech } from "@/lib/ai";
import {
  enforceRateLimit,
  requireSupabaseAuth,
  verifySpeechToken,
} from "@/lib/middleware/security";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireSupabaseAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.accessToken);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId")?.trim();
  const date = searchParams.get("date")?.trim();
  const token = searchParams.get("token")?.trim();

  if (!cardId || !date || !token) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const verified = verifySpeechToken(token);
  if (!verified || verified.cardId !== cardId || verified.date !== date) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient({ accessToken: auth.accessToken });
  const { data: task, error: taskError } = await supabase
    .from("word_memory_daily_tasks")
    .select("id")
    .eq("task_date", date)
    .maybeSingle();

  if (taskError || !task?.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data: card, error: cardError } = await supabase
    .from("word_memory_cards")
    .select("sentence")
    .eq("id", cardId)
    .eq("task_id", task.id)
    .maybeSingle();

  if (cardError || !card?.sentence) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const arrayBuffer = await ai_generateSpeech(card.sentence);

  return new NextResponse(new Uint8Array(arrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename="sentence.wav"`,
      "Content-Length": arrayBuffer.byteLength.toString(),
    },
  });
}
