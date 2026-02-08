export type MemoryCardCandidate = {
  words: string[];
  sentence?: string;
};

export type MemoryCardsQualityOptions = {
  minAvgWordsPerCard?: number;
};

export type MemoryCardsQuality = {
  min_avg_words_per_card: number;
  card_count: number;
  input_words_total: number;
  input_words_unique: number;
  output_words_total: number;
  output_words_unique: number;
  avg_words_per_card: number;
  min_words_per_card: number;
  max_words_per_card: number;
  one_word_cards: number;
  two_word_cards: number;
  three_word_cards: number;
  one_word_card_ratio: number;
  coverage_ratio: number;
  duplicate_words: number;
  duplicate_word_list: string[];
  missing_words: number;
  missing_word_list: string[];
  unknown_words: number;
  unknown_word_list: string[];
  pass: boolean;
};

export type MemoryCardsEvalSummary = {
  min_avg_words_per_card: number;
  run_count: number;
  pass_runs: number;
  pass_ratio: number;
  pass: boolean;
  avg_card_count: number;
  avg_words_per_card: number;
  min_avg_words_per_card_in_runs: number;
  max_avg_words_per_card_in_runs: number;
  avg_one_word_card_ratio: number;
  avg_coverage_ratio: number;
  total_duplicate_words: number;
  total_missing_words: number;
  total_unknown_words: number;
};

const DEFAULT_MIN_AVG_WORDS_PER_CARD = 2.2;

const normalizeWordToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();

const uniqueNormalizedWords = (words: string[]) => {
  const set = new Set<string>();
  for (const word of words) {
    const normalized = normalizeWordToken(word);
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, current) => sum + current, 0) / values.length;
};

export const evaluateMemoryCardsQuality = (
  inputWords: string[],
  cards: MemoryCardCandidate[],
  options?: MemoryCardsQualityOptions,
): MemoryCardsQuality => {
  const minAvgWordsPerCard =
    options?.minAvgWordsPerCard ?? DEFAULT_MIN_AVG_WORDS_PER_CARD;

  const normalizedInput = inputWords
    .map((word) => normalizeWordToken(word))
    .filter(Boolean);
  const inputUnique = Array.from(new Set(normalizedInput));

  const normalizedCards = cards.map((card) => uniqueNormalizedWords(card.words));
  const outputAll = normalizedCards.flat();
  const outputUnique = Array.from(new Set(outputAll));

  const outputSet = new Set(outputUnique);
  const inputSet = new Set(inputUnique);
  const missingWordList = inputUnique.filter((word) => !outputSet.has(word));
  const unknownWordList = outputUnique.filter((word) => !inputSet.has(word));
  const outputCounts = new Map<string, number>();
  for (const word of outputAll) {
    outputCounts.set(word, (outputCounts.get(word) ?? 0) + 1);
  }
  const duplicateWordList = Array.from(outputCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([word]) => word);
  const duplicateWords = Array.from(outputCounts.values()).reduce(
    (sum, count) => sum + (count > 1 ? count - 1 : 0),
    0,
  );

  const cardWordCounts = normalizedCards.map((cardWords) => cardWords.length);
  const cardCount = normalizedCards.length;
  const outputWordsTotal = cardWordCounts.reduce((sum, count) => sum + count, 0);
  const avgWordsPerCard = cardCount === 0 ? 0 : outputWordsTotal / cardCount;

  const oneWordCards = cardWordCounts.filter((count) => count === 1).length;
  const twoWordCards = cardWordCounts.filter((count) => count === 2).length;
  const threeWordCards = cardWordCounts.filter((count) => count === 3).length;
  const oneWordCardRatio = cardCount === 0 ? 0 : oneWordCards / cardCount;

  const coverageRatio =
    inputUnique.length === 0
      ? 0
      : (inputUnique.length - missingWordList.length) / inputUnique.length;

  const pass =
    cardCount > 0 &&
    avgWordsPerCard >= minAvgWordsPerCard &&
    duplicateWords === 0 &&
    missingWordList.length === 0 &&
    unknownWordList.length === 0;

  return {
    min_avg_words_per_card: minAvgWordsPerCard,
    card_count: cardCount,
    input_words_total: normalizedInput.length,
    input_words_unique: inputUnique.length,
    output_words_total: outputWordsTotal,
    output_words_unique: outputUnique.length,
    avg_words_per_card: avgWordsPerCard,
    min_words_per_card: cardWordCounts.length ? Math.min(...cardWordCounts) : 0,
    max_words_per_card: cardWordCounts.length ? Math.max(...cardWordCounts) : 0,
    one_word_cards: oneWordCards,
    two_word_cards: twoWordCards,
    three_word_cards: threeWordCards,
    one_word_card_ratio: oneWordCardRatio,
    coverage_ratio: coverageRatio,
    duplicate_words: duplicateWords,
    duplicate_word_list: duplicateWordList,
    missing_words: missingWordList.length,
    missing_word_list: missingWordList,
    unknown_words: unknownWordList.length,
    unknown_word_list: unknownWordList,
    pass,
  };
};

export const summarizeEvalRuns = (
  runQualities: MemoryCardsQuality[],
  options?: MemoryCardsQualityOptions,
): MemoryCardsEvalSummary => {
  const minAvgWordsPerCard =
    options?.minAvgWordsPerCard ?? DEFAULT_MIN_AVG_WORDS_PER_CARD;

  const runCount = runQualities.length;
  if (runCount === 0) {
    return {
      min_avg_words_per_card: minAvgWordsPerCard,
      run_count: 0,
      pass_runs: 0,
      pass_ratio: 0,
      pass: false,
      avg_card_count: 0,
      avg_words_per_card: 0,
      min_avg_words_per_card_in_runs: 0,
      max_avg_words_per_card_in_runs: 0,
      avg_one_word_card_ratio: 0,
      avg_coverage_ratio: 0,
      total_duplicate_words: 0,
      total_missing_words: 0,
      total_unknown_words: 0,
    };
  }

  const avgWordsList = runQualities.map((run) => run.avg_words_per_card);
  const passRuns = runQualities.filter((run) => run.pass).length;
  const totalDuplicateWords = runQualities.reduce(
    (sum, run) => sum + run.duplicate_words,
    0,
  );
  const totalMissingWords = runQualities.reduce(
    (sum, run) => sum + run.missing_words,
    0,
  );
  const totalUnknownWords = runQualities.reduce(
    (sum, run) => sum + run.unknown_words,
    0,
  );

  const avgWordsPerCard = average(avgWordsList);
  const pass =
    avgWordsPerCard >= minAvgWordsPerCard &&
    totalDuplicateWords === 0 &&
    totalMissingWords === 0 &&
    totalUnknownWords === 0;

  return {
    min_avg_words_per_card: minAvgWordsPerCard,
    run_count: runCount,
    pass_runs: passRuns,
    pass_ratio: passRuns / runCount,
    pass,
    avg_card_count: average(runQualities.map((run) => run.card_count)),
    avg_words_per_card: avgWordsPerCard,
    min_avg_words_per_card_in_runs: Math.min(...avgWordsList),
    max_avg_words_per_card_in_runs: Math.max(...avgWordsList),
    avg_one_word_card_ratio: average(
      runQualities.map((run) => run.one_word_card_ratio),
    ),
    avg_coverage_ratio: average(runQualities.map((run) => run.coverage_ratio)),
    total_duplicate_words: totalDuplicateWords,
    total_missing_words: totalMissingWords,
    total_unknown_words: totalUnknownWords,
  };
};
