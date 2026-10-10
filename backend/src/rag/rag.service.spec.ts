import { ServiceUnavailableException } from "@nestjs/common";
import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RagStreamEvent } from "../common/stream.js";
import { MIN_SIMILARITY, RagService } from "./rag.service.js";

const DOCS = [
  { file_name: "kb-a.md", content: "Pool exhausted by wrapping transactions.", similarity: 0.82 },
  { file_name: "kb-b.md", content: "Integer overflow on a foreign key.", similarity: 0.61 },
];

// Fake clients, so the tests never call Gemini or Supabase.
function setup(
  opts: {
    embedding?: number[] | null;
    rpcError?: string;
    docs?: typeof DOCS;
    chunks?: string[];
  } = {},
) {
  const embedContent = vi.fn(async (_args: unknown) => ({
    embeddings: opts.embedding === null ? [] : [{ values: opts.embedding ?? [0.1, 0.2, 0.3] }],
  }));
  const generateContentStream = vi.fn(async (_args: unknown) =>
    (async function* () {
      for (const text of opts.chunks ?? ["the answer"]) yield { text };
    })(),
  );
  const rpc = vi.fn(async (_fn: string, _args: unknown) =>
    opts.rpcError
      ? { data: null, error: { message: opts.rpcError } }
      : { data: opts.docs ?? DOCS, error: null },
  );

  const ai = { models: { embedContent, generateContentStream } } as unknown as GoogleGenAI;
  const supabase = { rpc } as unknown as SupabaseClient;
  return { service: new RagService(supabase, ai), embedContent, generateContentStream, rpc };
}

const promptSentToGemini = (generateContentStream: { mock: { calls: unknown[][] } }): string => {
  const args = generateContentStream.mock.calls[0]![0] as {
    contents: { parts: { text: string }[] }[];
  };
  return args.contents[0]!.parts[0]!.text;
};

async function collect(stream: AsyncGenerator<RagStreamEvent>) {
  const events: RagStreamEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

describe("RagService.search", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("embeds the query and asks Supabase for the closest documents", async () => {
    const docs = await ctx.service.search("pool exhausted", 2);

    expect(ctx.embedContent).toHaveBeenCalledTimes(1);
    expect(ctx.rpc).toHaveBeenCalledWith("match_incident_documents", {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 2,
    });
    expect(docs).toEqual(DOCS);
  });

  it("drops documents below the similarity threshold", async () => {
    const { service } = setup({
      docs: [
        { file_name: "close.md", content: "x", similarity: MIN_SIMILARITY + 0.1 },
        { file_name: "exact.md", content: "x", similarity: MIN_SIMILARITY },
        { file_name: "far.md", content: "x", similarity: MIN_SIMILARITY - 0.01 },
      ],
    });
    const docs = await service.search("anything");
    expect(docs.map((d) => d.file_name)).toEqual(["close.md", "exact.md"]);
  });

  it("throws ServiceUnavailable when no embedding comes back", async () => {
    const { service } = setup({ embedding: null });
    await expect(service.search("anything")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws ServiceUnavailable when the vector search fails", async () => {
    const { service } = setup({ rpcError: "function not found" });
    await expect(service.search("anything")).rejects.toThrow("function not found");
  });
});

describe("RagService.answer", () => {
  it("returns the model's answer with the sources it used", async () => {
    const { service } = setup({ chunks: ["Remove the wrapping transaction."] });
    const result = await service.answer("pool exhausted?");

    expect(result.answer).toBe("Remove the wrapping transaction.");
    expect(result.sources).toEqual([
      { file: "kb-a.md", similarity: 0.82 },
      { file: "kb-b.md", similarity: 0.61 },
    ]);
  });

  it("puts the retrieved context and the question in the prompt", async () => {
    const { service, generateContentStream } = setup();
    await service.answer("pool exhausted?");

    const prompt = promptSentToGemini(generateContentStream);
    expect(prompt).toContain("Pool exhausted by wrapping transactions.");
    expect(prompt).toContain("User Question: pool exhausted?");
    expect(prompt).not.toContain("Conversation so far");
  });

  it("asks for a Thai reply to a Thai question and English otherwise", async () => {
    const thai = setup();
    await thai.service.answer("connection pool เต็ม ทำไงดี");
    expect(promptSentToGemini(thai.generateContentStream)).toContain("entire reply in Thai");

    const english = setup();
    await english.service.answer("what causes pool exhaustion?");
    expect(promptSentToGemini(english.generateContentStream)).toContain("entire reply in English");
  });

  it("includes the earlier conversation and searches with the previous user message", async () => {
    const { service, generateContentStream, embedContent } = setup();
    await service.answer("what if that did not fix it?", [
      { role: "user", content: "requests wait 20s for a db connection" },
      { role: "assistant", content: "Remove the unnecessary transaction." },
    ]);

    const prompt = promptSentToGemini(generateContentStream);
    expect(prompt).toContain("Conversation so far:");
    expect(prompt).toContain("User: requests wait 20s for a db connection");
    expect(prompt).toContain("Assistant: Remove the unnecessary transaction.");

    // A follow-up has no searchable meaning alone, so the search text includes the earlier question.
    const embedArgs = embedContent.mock.calls[0]![0] as { contents: string };
    expect(embedArgs.contents).toContain("requests wait 20s for a db connection");
    expect(embedArgs.contents).toContain("what if that did not fix it?");
  });

  it("answers 'not found' without calling Gemini when nothing is similar enough", async () => {
    const { service, generateContentStream } = setup({
      docs: [{ file_name: "far.md", content: "x", similarity: 0.3 }],
    });

    const thai = await service.answer("สูตรต้มยำกุ้ง");
    expect(thai.sources).toEqual([]);
    expect(thai.answer).toContain("ไม่พบ post-mortem");

    const english = await service.answer("what is the capital of France?");
    expect(english.answer).toContain("No relevant post-mortem");

    expect(generateContentStream).not.toHaveBeenCalled();
  });
});

describe("RagService.answerStream", () => {
  it("sends sources first, then the text piece by piece, then done", async () => {
    const { service } = setup({ chunks: ["Remove ", "the ", "transaction."] });
    const events = await collect(service.answerStream("pool exhausted?"));

    expect(events[0]).toEqual({
      type: "sources",
      sources: [
        { file: "kb-a.md", similarity: 0.82 },
        { file: "kb-b.md", similarity: 0.61 },
      ],
    });
    expect(events.slice(1, 4)).toEqual([
      { type: "delta", text: "Remove " },
      { type: "delta", text: "the " },
      { type: "delta", text: "transaction." },
    ]);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("sends empty sources, the not-found text, and done when nothing matches", async () => {
    const { service } = setup({ docs: [] });
    const events = await collect(service.answerStream("what is the capital of France?"));

    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "done"]);
    expect(events[0]).toEqual({ type: "sources", sources: [] });
  });
});
