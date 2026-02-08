import { describe, expect, it } from "vitest";
import fixture from "@/lib/ai-eval/fixtures/memory-cards-task-2026-02-08.json";
import {
  evaluateMemoryCardsQuality,
  summarizeEvalRuns,
  type MemoryCardCandidate,
} from "@/lib/ai-eval/memory-cards/quality";

const MIN_AVG = 2.2;

const sentenceFor = (words: string[]) => `${words.join(" ")} example sentence`;

const baselineCards = (words: string[]): MemoryCardCandidate[] => {
  const twoWordPairs = [words.slice(0, 2), words.slice(2, 4), words.slice(4, 6)];
  const singles = words.slice(6).map((word) => [word]);
  return [...twoWordPairs, ...singles].map((group) => ({
    words: group,
    sentence: sentenceFor(group),
  }));
};

const compactCards = (words: string[]): MemoryCardCandidate[] => {
  const cards: MemoryCardCandidate[] = [];
  let cursor = 0;
  for (let i = 0; i < 11; i += 1) {
    const group = words.slice(cursor, cursor + 3);
    cursor += 3;
    cards.push({ words: group, sentence: sentenceFor(group) });
  }
  const finalPair = words.slice(cursor, cursor + 2);
  cards.push({ words: finalPair, sentence: sentenceFor(finalPair) });
  return cards;
};

describe("evaluateMemoryCardsQuality", () => {
  it("failure_baseline_0208_shape", () => {
    const quality = evaluateMemoryCardsQuality(fixture.words, baselineCards(fixture.words), {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(quality.card_count).toBe(32);
    expect(quality.avg_words_per_card).toBeCloseTo(35 / 32, 6);
    expect(quality.pass).toBe(false);
    expect(quality.missing_words).toBe(0);
    expect(quality.unknown_words).toBe(0);
  });

  it("pass_compact_shape", () => {
    const quality = evaluateMemoryCardsQuality(fixture.words, compactCards(fixture.words), {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(quality.card_count).toBe(12);
    expect(quality.avg_words_per_card).toBeCloseTo(35 / 12, 6);
    expect(quality.one_word_cards).toBe(0);
    expect(quality.pass).toBe(true);
  });

  it("coverage_guard", () => {
    const cards = compactCards(fixture.words).slice(0, -1);
    const quality = evaluateMemoryCardsQuality(fixture.words, cards, {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(quality.missing_words).toBeGreaterThan(0);
    expect(quality.coverage_ratio).toBeLessThan(1);
    expect(quality.pass).toBe(false);
  });

  it("unknown_word_guard", () => {
    const cards = compactCards(fixture.words);
    cards[0] = {
      words: [...cards[0].words, "not-in-input"],
      sentence: sentenceFor([...cards[0].words, "not-in-input"]),
    };

    const quality = evaluateMemoryCardsQuality(fixture.words, cards, {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(quality.unknown_words).toBe(1);
    expect(quality.unknown_word_list).toContain("not-in-input");
    expect(quality.pass).toBe(false);
  });

  it("duplicate_word_guard", () => {
    const cards = compactCards(fixture.words);
    cards[0] = {
      words: [...cards[0].words, cards[1].words[0]],
      sentence: sentenceFor([...cards[0].words, cards[1].words[0]]),
    };

    const quality = evaluateMemoryCardsQuality(fixture.words, cards, {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(quality.duplicate_words).toBe(1);
    expect(quality.duplicate_word_list.length).toBe(1);
    expect(quality.pass).toBe(false);
  });

  it("case_normalization", () => {
    const cards = fixture.words.map((word) => ({
      words: [word.toUpperCase()],
      sentence: sentenceFor([word]),
    }));

    const quality = evaluateMemoryCardsQuality(fixture.words, cards, {
      minAvgWordsPerCard: 1,
    });

    expect(quality.missing_words).toBe(0);
    expect(quality.unknown_words).toBe(0);
    expect(quality.coverage_ratio).toBe(1);
    expect(quality.pass).toBe(true);
  });
});

describe("summarizeEvalRuns", () => {
  it("aggregates run metrics and pass flag", () => {
    const poorRun = evaluateMemoryCardsQuality(fixture.words, baselineCards(fixture.words), {
      minAvgWordsPerCard: MIN_AVG,
    });
    const strongRun = evaluateMemoryCardsQuality(fixture.words, compactCards(fixture.words), {
      minAvgWordsPerCard: MIN_AVG,
    });

    const summary = summarizeEvalRuns([poorRun, strongRun, strongRun], {
      minAvgWordsPerCard: MIN_AVG,
    });

    expect(summary.run_count).toBe(3);
    expect(summary.pass_runs).toBe(2);
    expect(summary.avg_words_per_card).toBeGreaterThan(2.2);
    expect(summary.total_duplicate_words).toBe(0);
    expect(summary.total_missing_words).toBe(0);
    expect(summary.total_unknown_words).toBe(0);
    expect(summary.pass).toBe(true);
  });
});
