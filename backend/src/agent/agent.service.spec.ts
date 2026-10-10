import type { GoogleGenAI } from "@google/genai";
import type { AgentStreamEvent } from "../common/stream.js";
import type { MatchedDoc, RagService } from "../rag/rag.service.js";
import { AgentService } from "./agent.service.js";
import { MetricsService } from "./metrics.service.js";

// One fake Gemini stream chunk. `call` makes it a function call.
type FakeChunk = { text?: string; call?: { name: string; args: Record<string, unknown> } };
const chunk = ({ text, call }: FakeChunk) => ({
  text,
  functionCalls: call ? [call] : undefined,
  candidates: [
    {
      content: {
        role: "model",
        parts: call ? [{ functionCall: call }] : [{ text: text ?? "" }],
      },
    },
  ],
});

// Each entry is the chunks of one model turn, returned in order.
function setup(turns: FakeChunk[][], ragDocs: MatchedDoc[] = []) {
  const queue = [...turns];
  const generateContentStream = vi.fn(async (_args: unknown) => {
    const next = queue.shift() ?? [{ text: "(no more scripted turns)" }];
    return (async function* () {
      for (const c of next) yield chunk(c);
    })();
  });
  const search = vi.fn(async (_query: string) => ragDocs);

  const ai = { models: { generateContentStream } } as unknown as GoogleGenAI;
  const rag = { search } as unknown as RagService;
  return { agent: new AgentService(ai, rag, new MetricsService()), generateContentStream, search };
}

async function collect(stream: AsyncGenerator<AgentStreamEvent>) {
  const events: AgentStreamEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

const callToolsForever = () =>
  Array.from({ length: 10 }, () => [
    { call: { name: "check_service_health", args: { serviceName: "database" } } },
  ]);

describe("AgentService", () => {
  it("answers directly when the model calls no tool", async () => {
    const { agent } = setup([[{ text: "All good." }]]);
    const events = await collect(agent.runStream("hello"));
    expect(events).toEqual([
      { type: "delta", text: "All good." },
      { type: "done", truncated: false },
    ]);
  });

  it("runs the requested tool, then streams the final answer", async () => {
    const { agent, generateContentStream } = setup([
      [{ call: { name: "check_service_health", args: { serviceName: "database" } } }],
      [{ text: "Database is " }, { text: "degraded." }],
    ]);
    const events = await collect(agent.runStream("is the db ok?"));

    expect(events).toEqual([
      { type: "tool", name: "check_service_health", args: { serviceName: "database" } },
      { type: "delta", text: "Database is " },
      { type: "delta", text: "degraded." },
      { type: "done", truncated: false },
    ]);

    // The second model turn must have received the tool result.
    const secondTurn = generateContentStream.mock.calls[1]![0] as {
      contents: {
        role: string;
        parts: { functionResponse?: { response: { output: unknown } } }[];
      }[];
    };
    const toolReply = secondTurn.contents.at(-1)!;
    expect(toolReply.role).toBe("user");
    expect(toolReply.parts[0]!.functionResponse!.response.output).toMatchObject({
      service: "database",
      status: "DEGRADED",
    });
  });

  it("searches the knowledge base for query_incident_kb and passes the result on", async () => {
    const docs = [
      { file_name: "kb-a.md", content: "Fix: remove the transaction.", similarity: 0.8 },
    ];
    const { agent, search, generateContentStream } = setup(
      [
        [{ call: { name: "query_incident_kb", args: { query: "pool exhausted" } } }],
        [{ text: "ok" }],
      ],
      docs,
    );
    await collect(agent.runStream("db slow"));

    expect(search).toHaveBeenCalledWith("pool exhausted");
    const secondTurn = generateContentStream.mock.calls[1]![0] as {
      contents: {
        parts: { functionResponse?: { response: { output: { results: unknown[] } } } }[];
      }[];
    };
    const output = secondTurn.contents.at(-1)!.parts[0]!.functionResponse!.response.output;
    expect(output.results).toEqual([
      { file: "kb-a.md", relevance: "80.0%", content: "Fix: remove the transaction." },
    ]);
  });

  it("tells the model when no post-mortem is similar enough", async () => {
    const { agent, generateContentStream } = setup(
      [[{ call: { name: "query_incident_kb", args: { query: "tom yum" } } }], [{ text: "none" }]],
      [],
    );
    await collect(agent.runStream("tom yum recipe"));

    const secondTurn = generateContentStream.mock.calls[1]![0] as {
      contents: {
        parts: {
          functionResponse?: { response: { output: { results: unknown[]; note: string } } };
        }[];
      }[];
    };
    const output = secondTurn.contents.at(-1)!.parts[0]!.functionResponse!.response.output;
    expect(output.results).toEqual([]);
    expect(output.note).toContain("similar enough");
  });

  it("feeds an unknown tool name back to the model instead of crashing", async () => {
    const { agent, generateContentStream } = setup([
      [{ call: { name: "delete_everything", args: {} } }],
      [{ text: "sorry" }],
    ]);
    const events = await collect(agent.runStream("do it"));

    expect(events.at(-1)).toEqual({ type: "done", truncated: false });
    const secondTurn = generateContentStream.mock.calls[1]![0] as {
      contents: { parts: { functionResponse?: { response: { output: { error: string } } } }[] }[];
    };
    const output = secondTurn.contents.at(-1)!.parts[0]!.functionResponse!.response.output;
    expect(output.error).toContain("not implemented");
  });

  it("stops with truncated=true if the model keeps calling tools", async () => {
    const { agent, generateContentStream } = setup(callToolsForever());
    const events = await collect(agent.runStream("loop"));

    expect(events.at(-1)).toEqual({ type: "done", truncated: true });
    expect(events.filter((e) => e.type === "tool")).toHaveLength(5); // MAX_STEPS tool rounds
    expect(generateContentStream).toHaveBeenCalledTimes(6);
  });

  it("run() collects the stream into answer, toolCalls and truncated", async () => {
    const { agent } = setup([
      [{ call: { name: "check_service_health", args: { serviceName: "auth-service" } } }],
      [{ text: "Healthy." }],
    ]);
    const result = await agent.run("is auth ok?");

    expect(result).toEqual({
      answer: "Healthy.",
      toolCalls: [{ name: "check_service_health", args: { serviceName: "auth-service" } }],
      truncated: false,
    });
  });

  it("sends earlier turns to the model as user/model messages", async () => {
    const { agent, generateContentStream } = setup([[{ text: "ok" }]]);
    await collect(
      agent.runStream("and now?", [
        { role: "user", content: "first question" },
        { role: "assistant", content: "first answer" },
      ]),
    );

    const first = generateContentStream.mock.calls[0]![0] as {
      contents: { role: string; parts: { text: string }[] }[];
    };
    expect(first.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(first.contents.at(-1)!.parts[0]!.text).toBe("and now?");
  });
});
