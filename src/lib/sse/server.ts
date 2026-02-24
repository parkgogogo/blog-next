import { encodeSseEvent } from "@/lib/sse/encode";
import type { SseErrorPayload, SseEventName, SseWriter } from "@/lib/sse/types";

const DEFAULT_HEARTBEAT_MS = 15_000;

const withSseHeaders = (headers?: HeadersInit) => {
  const resolved = new Headers(headers);
  resolved.set("Content-Type", "text/event-stream; charset=utf-8");
  resolved.set("Cache-Control", "no-cache, no-transform");
  resolved.set("Connection", "keep-alive");
  resolved.set("X-Accel-Buffering", "no");
  return resolved;
};

const asErrorPayload = (error: unknown): SseErrorPayload => {
  if (error instanceof Error) {
    return {
      message: error.message || "stream_error",
    };
  }
  return {
    message: typeof error === "string" ? error : "stream_error",
  };
};

export const createSseResponse = (options: {
  signal?: AbortSignal;
  heartbeatMs?: number;
  status?: number;
  headers?: HeadersInit;
  handler: (writer: SseWriter) => Promise<void> | void;
}) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (isClosed) return;
        isClosed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        options.signal?.removeEventListener("abort", onAbort);
        controller.close();
      };

      const send = (event: SseEventName, data?: unknown) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
      };

      const writer: SseWriter = {
        get closed() {
          return isClosed;
        },
        send,
        meta: (data) => send("meta", data),
        chunk: (data) => send("chunk", data),
        done: (data) => send("done", data),
        error: (data) => send("error", data),
        ping: (data) => send("ping", data),
        close,
      };

      const onAbort = () => {
        close();
      };

      if (options.signal) {
        if (options.signal.aborted) {
          close();
          return;
        }
        options.signal.addEventListener("abort", onAbort);
      }

      const heartbeatMs = Math.max(1_000, options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);
      heartbeat = setInterval(() => {
        send("ping", { ts: Date.now() });
      }, heartbeatMs);

      void (async () => {
        try {
          await options.handler(writer);
        } catch (error) {
          if (!isClosed) {
            send("error", asErrorPayload(error));
          }
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    status: options.status ?? 200,
    headers: withSseHeaders(options.headers),
  });
};
