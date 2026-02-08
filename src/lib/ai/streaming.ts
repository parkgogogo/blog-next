type StreamChunk = {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
    text?: string;
  }>;
};

type StreamSseTextOptions = {
  response: Response;
  onDelta?: (delta: string) => void;
  onEventData?: (data: string) => void;
};

export const streamSseText = async ({
  response,
  onDelta,
  onEventData,
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

  const pushDelta = (delta: string) => {
    if (!delta) return;
    fullText += delta;
    onDelta?.(delta);
  };

  const consumeEvent = (event: string) => {
    const lines = event.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.replace(/^data:\s*/, "");
      onEventData?.(data);
      if (data === "[DONE]") {
        done = true;
        break;
      }
      try {
        const payload = JSON.parse(data) as StreamChunk;
        const delta =
          payload.choices?.[0]?.delta?.content ??
          payload.choices?.[0]?.message?.content ??
          payload.choices?.[0]?.text ??
          "";
        pushDelta(delta);
      } catch {
        continue;
      }
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
