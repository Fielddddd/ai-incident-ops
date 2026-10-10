import { withRetry } from "./retry.js";

const transient = (status: number) => Object.assign(new Error("busy"), { status });

describe("withRetry", () => {
  it("returns the result without retrying when the call succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return "ok";
      },
      3,
      1,
    );
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries on 503 and 429 until it succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls === 1) throw transient(503);
        if (calls === 2) throw transient(429);
        return "ok";
      },
      3,
      1,
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after the retry limit and throws the last error", async () => {
    let calls = 0;
    const run = withRetry(
      async () => {
        calls++;
        throw transient(503);
      },
      2,
      1,
    );
    await expect(run).rejects.toThrow("busy");
    expect(calls).toBe(3); // first try + 2 retries
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    const run = withRetry(
      async () => {
        calls++;
        throw transient(400);
      },
      3,
      1,
    );
    await expect(run).rejects.toThrow("busy");
    expect(calls).toBe(1);
  });
});
