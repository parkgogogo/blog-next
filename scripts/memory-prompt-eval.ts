import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { MEMORY_CARDS_PROMPT } from "../src/lib/memory/constants.ts";
import {
  evaluateMemoryCardsQuality,
  summarizeEvalRuns,
  type MemoryCardCandidate,
} from "../src/lib/ai-eval/memory-cards/quality.ts";

type RawContextRecord = {
  context_line: string;
  source_text: string;
  context: string;
  created_at: string;
};

type EvalFixture = {
  task_date: string;
  max_chars: number;
  max_sentences: number;
  max_words_per_card: number;
  words: string[];
  raw_contexts_by_word: Record<string, RawContextRecord[]>;
};

const args = process.argv.slice(2);

const pickArg = (name: string, fallback: string) => {
  const prefix = `${name}=`;
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
};

const parseNumberArg = (name: string, fallback: number) => {
  const value = Number(pickArg(name, `${fallback}`));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const runs = Math.max(1, Math.floor(parseNumberArg("--runs", 3)));
const minAvgWordsPerCard = parseNumberArg("--min-avg", 2.2);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultFixturePath = path.resolve(
  __dirname,
  "../src/lib/ai-eval/fixtures/memory-cards-task-2026-02-08.json",
);
const fixturePath = path.resolve(
  process.cwd(),
  pickArg("--fixture", defaultFixturePath),
);

const AI_TEXT_MODEL =
  process.env.AI_TEXT_MODEL?.trim() || "gemini-2.5-flash-lite";
const AI_TEXT_BASE_URL =
  process.env.AI_TEXT_BASE_URL?.trim() || process.env.AI_BASE_URL?.trim() || "";
const AI_TEXT_TOKEN =
  process.env.AI_TEXT_TOKEN?.trim() || process.env.AI_TOKEN?.trim() || "";

if (!AI_TEXT_BASE_URL || !AI_TEXT_TOKEN) {
  throw new Error(
    "please configure AI_TEXT_BASE_URL and AI_TEXT_TOKEN (or fallback AI_BASE_URL and AI_TOKEN)",
  );
}

const openai = createOpenAI({
  baseURL: AI_TEXT_BASE_URL,
  apiKey: AI_TEXT_TOKEN,
});

const model = openai.chat(AI_TEXT_MODEL);

const memoryCardsSchema = z.object({
  cards: z
    .array(
      z.object({
        words: z.array(z.string().min(1)).min(1).max(3),
        sentence: z.string().min(1),
      }),
    )
    .min(1),
});

const normalizeWordToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();

const normalizeCards = (raw: MemoryCardCandidate[], words: string[]) => {
  const lookup = new Map<string, string>();
  for (const word of words) {
    const normalized = normalizeWordToken(word);
    if (!normalized) continue;
    if (!lookup.has(normalized)) {
      lookup.set(normalized, word);
    }
  }

  return raw
    .map((card) => {
      const resolvedWords = card.words
        .map((word) => lookup.get(normalizeWordToken(word)) || "")
        .filter(Boolean);
      const uniqueWords = Array.from(new Set(resolvedWords)).slice(0, 3);
      return {
        words: uniqueWords,
        sentence: card.sentence ?? "",
      } satisfies MemoryCardCandidate;
    })
    .filter((card) => card.words.length > 0 && card.sentence.trim().length > 0);
};

const main = async () => {
  const fixtureRaw = await readFile(fixturePath, "utf8");
  const fixture = JSON.parse(fixtureRaw) as EvalFixture;

  const promptPayload = {
    words: fixture.words,
    max_chars: fixture.max_chars,
    max_sentences: fixture.max_sentences,
    max_words_per_card: fixture.max_words_per_card,
    raw_contexts_by_word: fixture.raw_contexts_by_word,
  };

  const prompt = JSON.stringify(promptPayload, null, 2);
  const runQualities = [];

  for (let i = 0; i < runs; i += 1) {
    const startedAt = Date.now();
    const { object } = await Promise.race([
      generateObject({
        output: "object",
        model,
        system: MEMORY_CARDS_PROMPT,
        prompt,
        schema: memoryCardsSchema,
        schemaName: "memory_cards_eval",
        schemaDescription:
          "Memory card grouping evaluation output with cards containing 1-3 words.",
        providerOptions: {
          openai: {
            structuredOutputs: true,
            strictJsonSchema: false,
          },
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("memory prompt eval timeout")), 30000);
      }),
    ]);

    const cards = normalizeCards(object.cards, fixture.words);
    const quality = evaluateMemoryCardsQuality(fixture.words, cards, {
      minAvgWordsPerCard,
    });

    runQualities.push(quality);

    const durationMs = Date.now() - startedAt;
    console.log(
      `run ${i + 1}/${runs} | cards=${quality.card_count} avg=${quality.avg_words_per_card.toFixed(4)} missing=${quality.missing_words} unknown=${quality.unknown_words} pass=${quality.pass} duration_ms=${durationMs}`,
    );
  }

  const summary = summarizeEvalRuns(runQualities, {
    minAvgWordsPerCard,
  });

  console.log("--- memory prompt eval summary ---");
  console.log(
    JSON.stringify(
      {
        fixture: fixture.task_date,
        model: AI_TEXT_MODEL,
        runs,
        min_avg_words_per_card: minAvgWordsPerCard,
        per_run: runQualities,
        summary,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
