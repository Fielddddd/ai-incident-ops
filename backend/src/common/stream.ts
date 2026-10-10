import { HttpException, Logger } from "@nestjs/common";

// What the streaming endpoints send, one JSON object per line (NDJSON).
export type RagStreamEvent =
  | { type: "sources"; sources: { file: string; similarity: number }[] }
  | { type: "delta"; text: string }
  | { type: "done" };

export type AgentStreamEvent =
  | { type: "tool"; name: string; args: Record<string, unknown> }
  | { type: "delta"; text: string }
  | { type: "done"; truncated: boolean };

// The few Express response members we use, so we do not depend on @types/express.
export interface WritableResponse {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  flushHeaders?(): void;
  write(chunk: string): unknown;
  end(): unknown;
  on(event: "close", listener: () => void): unknown;
  writableEnded: boolean;
}

const logger = new Logger("Stream");

// Writes each event as it is produced. Errors after the first byte cannot change the HTTP status,
// so they are sent as a final {"type":"error"} line instead.
export async function streamNdjson(res: WritableResponse, events: AsyncIterable<unknown>) {
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientGone = false;
  res.on("close", () => {
    clientGone = !res.writableEnded;
  });

  try {
    for await (const event of events) {
      if (clientGone) break; // stops the generator, so no more Gemini output is read
      res.write(JSON.stringify(event) + "\n");
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    if (!clientGone) {
      const message =
        error instanceof HttpException ? error.message : "The AI service failed. Please try again.";
      res.write(JSON.stringify({ type: "error", message }) + "\n");
    }
  } finally {
    res.end();
  }
}
