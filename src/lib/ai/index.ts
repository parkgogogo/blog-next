import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { JSONValue } from "@ai-sdk/provider";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import OpenAI from "openai";
import type { ZodType } from "zod";

export const AI_TEXT_MODEL =
  process.env.AI_TEXT_MODEL?.trim() || "gemini-2.5-flash-lite";
export const AI_SPEECH_MODEL =
  process.env.AI_SPEECH_MODEL?.trim() || "gpt-4o-mini-tts";
export const AI_SPEECH_VOICE = "shimmer";
export const AI_SPEECH_FORMAT = "wav";
export const AI_TEXT_BASE_URL =
  process.env.AI_TEXT_BASE_URL?.trim() || process.env.AI_BASE_URL?.trim() || "";
export const AI_TEXT_TOKEN =
  process.env.AI_TEXT_TOKEN?.trim() || process.env.AI_TOKEN?.trim() || "";
export const AI_SPEECH_BASE_URL =
  process.env.AI_SPEECH_BASE_URL?.trim() ||
  process.env.AI_BASE_URL?.trim() ||
  "";
export const AI_SPEECH_TOKEN =
  process.env.AI_SPEECH_TOKEN?.trim() || process.env.AI_TOKEN?.trim() || "";

const getTextModel = () => {
  if (!AI_TEXT_BASE_URL || !AI_TEXT_TOKEN) {
    throw new Error(
      "please configure AI_TEXT_BASE_URL and AI_TEXT_TOKEN (or fallback AI_BASE_URL and AI_TOKEN)",
    );
  }

  const openai = createOpenAI({
    baseURL: AI_TEXT_BASE_URL,
    apiKey: AI_TEXT_TOKEN,
  });

  return openai.chat(AI_TEXT_MODEL);
};

const mergeProviderOptions = (
  input?: ProviderOptions,
): ProviderOptions => {
  const defaultOpenAI: Record<string, JSONValue> = {
    structuredOutputs: true,
    strictJsonSchema: false,
  };

  const inputOpenAI =
    input?.openai && typeof input.openai === "object"
      ? (input.openai as Record<string, JSONValue>)
      : {};

  const openaiOptions: Record<string, JSONValue> = {
    ...defaultOpenAI,
    ...inputOpenAI,
  };

  return {
    ...(input ?? {}),
    openai: openaiOptions,
  };
};

export const ai_generateSpeech = async (text: string) => {
  if (!AI_SPEECH_BASE_URL || !AI_SPEECH_TOKEN) {
    throw new Error(
      "please configure AI_SPEECH_BASE_URL and AI_SPEECH_TOKEN (or fallback AI_BASE_URL and AI_TOKEN)",
    );
  }

  const openai = new OpenAI({
    baseURL: AI_SPEECH_BASE_URL,
    apiKey: AI_SPEECH_TOKEN,
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
  const { text } = await Promise.race([
    generateText({
      model: getTextModel(),
      system: options.system,
      prompt: options.prompt,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI text timeout")), 8000),
    ),
  ]);

  return text;
};

export const ai_generateObject = async <T extends Record<string, unknown>>(
  options: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
  providerOptions?: ProviderOptions;
},
) => {
  const { object } = await Promise.race([
    generateObject({
      output: "object",
      model: getTextModel(),
      system: options.system,
      prompt: options.prompt,
      schema: options.schema,
      schemaName: options.schemaName,
      schemaDescription: options.schemaDescription,
      providerOptions: mergeProviderOptions(options.providerOptions),
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI object timeout")), 8000),
    ),
  ]);

  return object;
};
