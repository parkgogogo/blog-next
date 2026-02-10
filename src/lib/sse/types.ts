export type SseEventName = "meta" | "chunk" | "done" | "error" | "ping";

export type SseChunkPayload = {
  delta: string;
};

export type SseErrorPayload = {
  message: string;
  code?: string;
};

export interface SseWriter {
  readonly closed: boolean;
  send: (event: SseEventName, data?: unknown) => void;
  meta: (data?: unknown) => void;
  chunk: (data: SseChunkPayload) => void;
  done: (data?: unknown) => void;
  error: (data: SseErrorPayload) => void;
  ping: (data?: unknown) => void;
  close: () => void;
}
