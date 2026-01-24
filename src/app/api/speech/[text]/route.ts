import { NextRequest, NextResponse } from "next/server";
import { ai_generateSpeech } from "@/lib/ai";
import { WordsService } from "@/lib/words";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ text: string }> },
) {
  const { text } = await params;

  const wordsList = await WordsService.getAllWordUuids();
  if (!wordsList.includes(text)) {
    return NextResponse.error();
  }

  const arrayBuffer = await ai_generateSpeech(text);

  return new NextResponse(new Uint8Array(arrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=3600, s-maxage=31536000",
      "Content-Disposition": `inline; filename="${text}.wav"`,
      "Content-Length": arrayBuffer.byteLength.toString(),
    },
  });
}
