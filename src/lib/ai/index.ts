import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";

export const AI_TEXT_MODEL = "gemini-2.5-flash-lite";
export const AI_SPEECH_MODEL = "gpt-4o-mini-tts";
export const AI_SPEECH_VOICE = "shimmer";
export const AI_SPEECH_FORMAT = "wav";

export const ai_generateSpeech = async (text: string) => {
  const BASE_URL = process.env.AI_BASE_URL;
  const TOKEN = process.env.AI_TOKEN;

  if (!BASE_URL || !TOKEN) {
    throw new Error("please configure AI_BASE_URL and AI_TOKEN");
  }

  const openai = new OpenAI({
    baseURL: BASE_URL,
    apiKey: TOKEN,
  });

  const mp3 = await openai.audio.speech.create({
    model: AI_SPEECH_MODEL,
    voice: AI_SPEECH_VOICE,
    input: text,
    response_format: AI_SPEECH_FORMAT,
  });

  return await mp3.arrayBuffer();
};

export const ai_generateText = async (options: {
  system: string;
  prompt: string;
}) => {
  const BASE_URL = process.env.AI_BASE_URL;
  const TOKEN = process.env.AI_TOKEN;

  if (!BASE_URL || !TOKEN) {
    throw new Error("please configure AI_BASE_URL and AI_TOKEN");
  }

  const openai = createOpenAI({
    baseURL: BASE_URL,
    apiKey: TOKEN,
  });

  const { text } = await Promise.race([
    generateText({
      model: openai.chat(AI_TEXT_MODEL),
      system: options.system,
      prompt: options.prompt,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI text timeout")), 8000),
    ),
  ]);

  return text;
};
