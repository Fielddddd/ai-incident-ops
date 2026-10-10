// Retries transient Gemini errors (503 overloaded / 429 rate-limited) with exponential backoff.
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (retries > 0 && (status === 503 || status === 429)) {
      await new Promise((res) => setTimeout(res, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}
