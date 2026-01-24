export interface WordContextInput {
  line: string;
}

export interface WordInput {
  uuid: string;
  word?: string;
  context: WordContextInput;
  id?: string;
  exp?: string;
  addtime?: string;
  phon?: string;
}

export interface StoryWordCardRequest {
  word: WordInput;
  story: string;
  force?: boolean;
}

export interface WordExplanationRequest {
  word: WordInput;
  force?: boolean;
}

export interface SentenceTranslationRequest {
  text: string;
  force?: boolean;
}

export interface TranslationResponse {
  type: string;
  content: string;
}
