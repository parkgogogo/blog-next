"use client";

export type DailyMemoryEventType = "exposure" | "open_card" | "mark_known";

export type DailyMemoryEventPayload = {
  wordId: string;
  eventType: DailyMemoryEventType;
  deltaScore?: number | null;
  meta?: Record<string, unknown> | null;
};

type PendingMemoryEvent = DailyMemoryEventPayload & {
  id: string;
  signature: string;
  ts: number;
  attempts: number;
  nextAt?: number | null;
};

const STORAGE_KEY = "daily-memory-event-queue:v1";
const MAX_QUEUE_SIZE = 200;

const buildSignature = (payload: DailyMemoryEventPayload) => {
  const meta = payload.meta ?? {};
  const source = typeof meta.source === "string" ? meta.source : "";
  const date = typeof meta.date === "string" ? meta.date : "";
  const delta = payload.deltaScore ?? "";
  return `${payload.wordId}|${payload.eventType}|${source}|${date}|${delta}`;
};

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readQueue = (): PendingMemoryEvent[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingMemoryEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.id === "string");
  } catch {
    return [];
  }
};

const writeQueue = (queue: PendingMemoryEvent[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors.
  }
};

const backoffMs = (attempts: number) => {
  const base = 1500;
  const max = 60_000;
  return Math.min(max, base * 2 ** Math.min(attempts, 6));
};

export const enqueuePendingMemoryEvent = (payload: DailyMemoryEventPayload) => {
  if (!canUseStorage()) return;
  const signature = buildSignature(payload);
  const queue = readQueue();
  const existingIndex = queue.findIndex((entry) => entry.signature === signature);
  const entry: PendingMemoryEvent = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signature,
    ts: Date.now(),
    attempts: 0,
    nextAt: null,
  };
  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      ...entry,
    };
  } else {
    queue.push(entry);
  }
  const trimmed = queue.slice(-MAX_QUEUE_SIZE);
  writeQueue(trimmed);
};

export const flushPendingMemoryEvents = async (
  send: (payload: DailyMemoryEventPayload) => Promise<unknown>,
) => {
  if (!canUseStorage()) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  const now = Date.now();
  const remaining: PendingMemoryEvent[] = [];
  for (const entry of queue) {
    if (entry.nextAt && entry.nextAt > now) {
      remaining.push(entry);
      continue;
    }
    try {
      await send(entry);
    } catch {
      const attempts = entry.attempts + 1;
      remaining.push({
        ...entry,
        attempts,
        nextAt: Date.now() + backoffMs(attempts),
      });
    }
  }
  writeQueue(remaining);
};
