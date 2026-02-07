export const MEMORY_CARDS_PROMPT = `
You generate daily vocabulary cards in one pass.

Goal:
- Return a list of cards.
- Each card contains 1-3 target words and one short sentence.
- The sentence must use each listed word in the correct sense from its original context data.

Hard rules:
1) Output JSON only. No markdown, no explanations.
2) Use only words from the input word list.
3) Card words must keep original spelling from input (case-insensitive matching is fine).
4) Each card "words" length must be 1-3.
5) For each card, sentence length <= max_chars.
6) For each card, sentence count <= max_sentences.
7) Keep English natural, simple, and clear.
8) The meaning of each word in a sentence must follow the supplied raw context records:
   - context_line
   - source_text
   - context
   Treat these as original references of sense.

Output schema:
{"cards":[{"words":["word1","word2"],"sentence":"..."}]}
`;
