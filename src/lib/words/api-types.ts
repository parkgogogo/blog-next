import { z } from "zod";
import {
  addWordEntryRequestSchema,
  wordCardDailyV2RequestSchema,
  wordCardModeSchema,
  wordCardPluginV2RequestSchema,
  contextSnippetRequestSchema,
  sentenceTranslationRequestSchema,
  storyWordCardRequestSchema,
  wordCardBundleRequestSchema,
  wordContextSchema,
  wordExplanationRequestSchema,
  wordInputSchema,
} from "@/lib/schemas/words";

export type WordContextInput = z.infer<typeof wordContextSchema>;
export type WordInput = z.infer<typeof wordInputSchema>;
export type StoryWordCardRequest = z.infer<typeof storyWordCardRequestSchema>;
export type WordExplanationRequest = z.infer<typeof wordExplanationRequestSchema>;
export type SentenceTranslationRequest = z.infer<typeof sentenceTranslationRequestSchema>;
export type ContextSnippetRequest = z.infer<typeof contextSnippetRequestSchema>;
export type WordCardBundleRequest = z.infer<typeof wordCardBundleRequestSchema>;
export type WordCardMode = z.infer<typeof wordCardModeSchema>;
export type WordCardPluginV2Request = z.infer<typeof wordCardPluginV2RequestSchema>;
export type WordCardDailyV2Request = z.infer<typeof wordCardDailyV2RequestSchema>;
export type AddWordEntryRequest = z.infer<typeof addWordEntryRequestSchema>;
