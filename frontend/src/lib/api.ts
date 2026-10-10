const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface Source {
  file: string;
  similarity: number;
}
export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

// One line of the backend's streaming reply (NDJSON).
export type StreamEvent =
  | { type: "sources"; sources: Source[] }
  | { type: "tool"; name: string; args: Record<string, unknown> }
  | { type: "delta"; text: string }
  | { type: "done"; truncated?: boolean }
  | { type: "error"; message: string };

// The connection closed before the backend said "done".
export class StreamInterruptedError extends Error {
  constructor() {
    super("Stream ended before the answer finished");
    this.name = "StreamInterruptedError";
  }
}

async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(msg ?? `Request failed (${res.status})`);
  }
  if (!res.body) throw new StreamInterruptedError();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let event: StreamEvent;
    try {
      event = JSON.parse(line) as StreamEvent;
    } catch {
      // A line cut off mid-way means the connection dropped while the backend was writing.
      throw new StreamInterruptedError();
    }
    if (event.type === "error") throw new Error(event.message);
    if (event.type === "done") finished = true;
    onEvent(event);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // A chunk can hold several lines or stop mid-line, so only complete lines are handled.
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  handleLine(buffer + decoder.decode());
  if (!finished) throw new StreamInterruptedError();
}

export const streamAsk = (
  question: string,
  history: HistoryItem[],
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
) => streamPost("/rag/ask/stream", { question, history }, onEvent, signal);

export const streamAgent = (
  prompt: string,
  history: HistoryItem[],
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
) => streamPost("/agent/run/stream", { prompt, history }, onEvent, signal);

export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/incidents/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
