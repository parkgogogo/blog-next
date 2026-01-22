import { NextRequest, NextResponse } from "next/server";
import { ai_generateSpeech } from "@/lib/ai";
import { redis } from "@/lib/redis";
import { REDIS_KEYS } from "@/constants/redis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ text: string }> },
) {
  const { text } = await params;

  // 检查 redis 缓存，防止被滥用
  const redisString = await redis.get<string>(REDIS_KEYS.ALL_WORDS);
  const wordsList = (() => {
    if (redisString) {
      return redisString.split(",");
    }
    return [];
  })();
  // 没有命中 redis 缓存，直接返回
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
