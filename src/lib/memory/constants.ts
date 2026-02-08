export const MEMORY_CARDS_PROMPT = `
You generate daily vocabulary cards in one pass.

Goal:
- Return a list of cards.
- Each card contains 1-3 target words and one short sentence.
- The sentence must use each listed word in the correct sense from its original context data.
- The grouping must be compact, not sparse.

Hard rules:
1) Output JSON only. No markdown, no explanations.
2) Use only words from the input word list.
3) Card words must keep original spelling from input (case-insensitive matching is fine).
4) Grouping constraints:
   - each card has 1-3 words
   - prefer 3-word cards first, then 2-word cards
   - use 1-word cards only when compatibility is truly impossible
   - one-word cards should stay a small minority
5) Coverage constraints:
   - every input word must appear exactly once across all cards
   - no missing words
   - no duplicated words across cards
6) Compactness target:
   - let N be input word count
   - target card_count <= floor(N / 2.2)
   - for N=35 this means card_count <= 15
7) Sentence constraints:
   - sentence length <= max_chars
   - sentence count <= max_sentences
   - keep English natural, simple, and clear
8) Sense constraints:
   - meaning must follow supplied raw context records: context_line, source_text, context

Required workflow (must follow):
A) Keep the same global word order as the input list.
B) Partition the input list into contiguous groups (1-3 words each), with compact grouping preference (3 > 2 > 1).
C) Verify each input word appears in exactly one group and no group overlaps.
D) Verify card_count and average words/card satisfy compactness target.
E) Then write one sentence for each group and output final JSON.

Output schema:
{"cards":[{"words":["word1","word2"],"sentence":"..."}]}
`;
