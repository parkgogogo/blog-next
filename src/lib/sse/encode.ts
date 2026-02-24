import type { SseEventName } from "@/lib/sse/types";

const stringifyData = (data: unknown) => {
  if (typeof data === "string") return data;
  if (data === undefined) return "{}";
  try {
    return JSON.stringify(data);
  } catch {
    return JSON.stringify({ message: String(data) });
  }
};

export const encodeSseEvent = (event: SseEventName, data?: unknown) => {
  return `event: ${event}\ndata: ${stringifyData(data)}\n\n`;
};
