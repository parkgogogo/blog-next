export type ParsedSseEvent = {
  event: string;
  data: string;
};

export const consumeSse = async (options: {
  response: Response;
  onEvent?: (event: ParsedSseEvent) => void;
}) => {
  if (!options.response.ok) {
    throw new Error(`Streaming request failed: ${options.response.status}`);
  }
  if (!options.response.body) {
    throw new Error("Streaming response has no body");
  }

  const reader = options.response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const emitEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/);
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    const event = {
      event: eventName,
      data: dataLines.join("\n"),
    } satisfies ParsedSseEvent;
    options.onEvent?.(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      if (!event.trim()) continue;
      emitEvent(event);
    }
  }

  buffer += decoder.decode();
  for (const event of buffer.split(/\r?\n\r?\n/)) {
    if (!event.trim()) continue;
    emitEvent(event);
  }
};
