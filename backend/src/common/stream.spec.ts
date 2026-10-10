import { ServiceUnavailableException } from "@nestjs/common";
import { streamNdjson, type WritableResponse } from "./stream.js";

// A fake HTTP response that records what is written.
function fakeResponse() {
  const lines: string[] = [];
  const headers: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const res = {
    statusCode: 0,
    writableEnded: false,
    status(code: number) {
      res.statusCode = code;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    write(chunk: string) {
      lines.push(chunk);
    },
    end() {
      res.writableEnded = true;
    },
    on(event: string, listener: () => void) {
      listeners[event] = listener;
    },
  };
  return { res: res as unknown as WritableResponse & typeof res, lines, headers, listeners };
}

async function* events(...items: unknown[]) {
  for (const item of items) yield item;
}

describe("streamNdjson", () => {
  it("writes one JSON object per line with NDJSON headers, then ends", async () => {
    const { res, lines, headers } = fakeResponse();
    await streamNdjson(res, events({ type: "delta", text: "hi" }, { type: "done" }));

    expect(res.statusCode).toBe(200);
    expect(headers["Content-Type"]).toContain("application/x-ndjson");
    expect(headers["Cache-Control"]).toContain("no-cache");
    expect(lines).toEqual(['{"type":"delta","text":"hi"}\n', '{"type":"done"}\n']);
    expect(res.writableEnded).toBe(true);
  });

  it("keeps non-ASCII text readable on the wire", async () => {
    const { res, lines } = fakeResponse();
    await streamNdjson(res, events({ type: "delta", text: "สวัสดี" }));
    expect(JSON.parse(lines[0]!)).toEqual({ type: "delta", text: "สวัสดี" });
  });

  it("sends an error line (and still ends) when the stream throws midway", async () => {
    const { res, lines } = fakeResponse();
    async function* failing() {
      yield { type: "delta", text: "partial" };
      throw new ServiceUnavailableException("Vector match failed");
    }
    await streamNdjson(res, failing());

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]!)).toEqual({ type: "error", message: "Vector match failed" });
    expect(res.writableEnded).toBe(true);
  });

  it("hides internal error details from the client", async () => {
    const { res, lines } = fakeResponse();
    async function* failing() {
      yield* [];
      throw new Error("secret: key=abc123 at /internal/path");
    }
    await streamNdjson(res, failing());

    const sent = JSON.parse(lines[0]!);
    expect(sent.type).toBe("error");
    expect(sent.message).not.toContain("abc123");
  });

  it("stops reading once the client has disconnected", async () => {
    const { res, lines, listeners } = fakeResponse();
    let produced = 0;
    async function* endless() {
      while (true) {
        produced++;
        yield { type: "delta", text: "x" };
        if (produced === 2) listeners.close?.(); // browser closes the connection
        if (produced > 50) return;
      }
    }
    await streamNdjson(res, endless());

    expect(lines.length).toBeLessThan(5);
    expect(produced).toBeLessThan(10);
  });
});
