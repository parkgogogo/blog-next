type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: unknown;
      text?: unknown;
    };
    message?: { content?: unknown };
    text?: unknown;
  }>;
  candidates?: Array<{
    content?: {
      parts?: unknown;
    };
  }>;
  response?: {
    output_text?: unknown;
  };
  content?: unknown;
  delta?: unknown;
  text?: unknown;
  output_text?: unknown;
  message?: string;
  error?: {
    message?: string;
  };
};

type StreamExtractResult = {
  text: string;
  snapshot: boolean;
};

type StreamSseTextOptions = {
  response: Response;
  onDelta?: (delta: string) => void;
  onEventData?: (data: string, eventName: string) => void;
  onEvent?: (event: { event: string; data: string }) => void;
};

export const streamSseText = async ({
  response,
  onDelta,
  onEventData,
  onEvent,
}: StreamSseTextOptions) => {
  if (!response.ok) {
    throw new Error(`Streaming request failed: ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Streaming response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";
  let done = false;
  let lastSnapshot = "";

  const asObject = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object") return null;
    return value as Record<string, unknown>;
  };

  const readTextLike = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value.map((entry) => readTextLike(entry)).join("");
    }
    const objectValue = asObject(value);
    if (!objectValue) return "";
    if (typeof objectValue.text === "string") {
      return objectValue.text;
    }
    if (typeof objectValue.output_text === "string") {
      return objectValue.output_text;
    }
    if ("content" in objectValue) {
      return readTextLike(objectValue.content);
    }
    if ("parts" in objectValue) {
      return readTextLike(objectValue.parts);
    }
    return "";
  };

  const extractStreamText = (payload: StreamChunk): StreamExtractResult => {
    const firstChoice =
      Array.isArray(payload.choices) &&
      payload.choices.length > 0 &&
      payload.choices[0]
        ? payload.choices[0]
        : null;
    const firstCandidate =
      Array.isArray(payload.candidates) &&
      payload.candidates.length > 0 &&
      payload.candidates[0]
        ? payload.candidates[0]
        : null;

    const deltaText =
      readTextLike(payload.delta) ||
      readTextLike(firstChoice?.delta?.content) ||
      readTextLike(firstChoice?.delta?.text) ||
      readTextLike(firstChoice?.text);

    if (deltaText) {
      return { text: deltaText, snapshot: false };
    }

    const snapshotText =
      readTextLike(payload.text) ||
      readTextLike(payload.output_text) ||
      readTextLike(payload.response?.output_text) ||
      readTextLike(firstChoice?.message?.content) ||
      readTextLike(firstCandidate?.content?.parts) ||
      readTextLike(payload.content);

    if (!snapshotText) {
      return { text: "", snapshot: false };
    }

    return {
      text: snapshotText,
      snapshot: true,
    };
  };

  const pushDelta = (delta: string) => {
    if (!delta) return;
    fullText += delta;
    onDelta?.(delta);
  };

  const consumeEvent = (event: string) => {
    const lines = event.split(/\r?\n/);
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    const data = dataLines.join("\n");
    onEvent?.({
      event: eventName,
      data,
    });
    onEventData?.(data, eventName);

    if (data === "[DONE]") {
      done = true;
      return;
    }

    if (eventName === "ping") {
      return;
    }

    if (eventName === "error") {
      let message = data || "stream_error";
      try {
        const payload = JSON.parse(data) as StreamChunk;
        message = payload.error?.message || payload.message || message;
      } catch {
        // Ignore parse failures and use raw data as error message.
      }
      throw new Error(message);
    }

    try {
      const payload = JSON.parse(data) as StreamChunk;
      const extracted = extractStreamText(payload);
      if (extracted.snapshot) {
        const incremental = extracted.text.startsWith(lastSnapshot)
          ? extracted.text.slice(lastSnapshot.length)
          : extracted.text;
        lastSnapshot = extracted.text;
        pushDelta(incremental);
      } else {
        pushDelta(extracted.text);
      }
    } catch {
      // If event data is plain text, preserve backward compatibility.
      if (eventName === "chunk" || eventName === "message") {
        pushDelta(data);
      }
    }

    if (eventName === "done") {
      done = true;
    }
  };

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      consumeEvent(event);
      if (done) break;
    }
  }

  buffer += decoder.decode();
  if (!done && buffer.trim()) {
    const trailingEvents = buffer
      .split(/\r?\n\r?\n/)
      .filter((event) => event.trim().length > 0);
    for (const event of trailingEvents) {
      consumeEvent(event);
      if (done) break;
    }
  }

  return fullText;
};
