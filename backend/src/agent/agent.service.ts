import { Inject, Injectable } from "@nestjs/common";
import {
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type GoogleGenAI,
  type Part,
} from "@google/genai";
import { GEMINI_CLIENT } from "../gemini/gemini.constants.js";
import { RagService } from "../rag/rag.service.js";
import { MetricsService } from "./metrics.service.js";
import { withRetry } from "../common/retry.js";
import { detectLanguage, languageInstruction } from "../common/language.js";
import type { HistoryMessageDto } from "../common/history.dto.js";
import type { AgentStreamEvent } from "../common/stream.js";

const MODEL = "gemini-3.5-flash-lite";
const MAX_STEPS = 5;

const SYSTEM_INSTRUCTION = `You are an automated Site Reliability Engineer (SRE) Assistant for high-throughput production infrastructure.
You have access to tools for checking live telemetry metrics and searching historical incident post-mortems.
If an operator reports high latency or degraded performance, check the service health first.
If a service is degraded or failing, search the knowledge base for matching historical post-mortems and provide immediate remediation steps.`;

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "check_service_health",
    description:
      "Inspects real-time runtime metrics, latency, and operational health of a backend service.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        serviceName: {
          type: Type.STRING,
          description: 'Name of the service (e.g., "database", "api-gateway", "auth-service").',
        },
      },
      required: ["serviceName"],
    },
  },
  {
    name: "query_incident_kb",
    description:
      "Searches historical post-mortem incident reports in the knowledge base using vector similarity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Search query describing the technical symptoms, error messages, or failure patterns.",
        },
      },
      required: ["query"],
    },
  },
];

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
}

@Injectable()
export class AgentService {
  constructor(
    @Inject(GEMINI_CLIENT) private readonly ai: GoogleGenAI,
    private readonly rag: RagService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Runs the tool-calling loop and reports progress as it happens: each tool call, then the
   * answer text piece by piece. Text the model writes before a tool call is passed on as well.
   */
  async *runStream(
    prompt: string,
    history: HistoryMessageDto[] = [],
  ): AsyncGenerator<AgentStreamEvent> {
    const messages: Content[] = [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ];
    const systemInstruction = `${SYSTEM_INSTRUCTION}
${languageInstruction(detectLanguage(prompt))}`;

    for (let step = 0; ; step++) {
      const stream = await withRetry(() =>
        this.ai.models.generateContentStream({
          model: MODEL,
          contents: messages,
          config: { systemInstruction, tools: [{ functionDeclarations: TOOL_DECLARATIONS }] },
        }),
      );

      const modelParts: Part[] = [];
      const calls: FunctionCall[] = [];
      for await (const chunk of stream) {
        modelParts.push(...(chunk.candidates?.[0]?.content?.parts ?? []));
        if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
        if (chunk.text) yield { type: "delta", text: chunk.text };
      }

      if (calls.length === 0) {
        yield { type: "done", truncated: false };
        return;
      }
      if (step >= MAX_STEPS) {
        yield {
          type: "delta",
          text: "The agent stopped after reaching the maximum number of tool-calling steps.",
        };
        yield { type: "done", truncated: true };
        return;
      }

      messages.push({ role: "model", parts: modelParts });

      const responseParts: Part[] = [];
      for (const call of calls) {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, unknown>;
        yield { type: "tool", name, args };
        responseParts.push({
          functionResponse: { name, response: { output: await this.execute(name, args) } },
        });
      }
      messages.push({ role: "user", parts: responseParts });
    }
  }

  async run(prompt: string, history: HistoryMessageDto[] = []) {
    let answer = "";
    let truncated = false;
    const toolCalls: ToolCallRecord[] = [];
    for await (const event of this.runStream(prompt, history)) {
      if (event.type === "delta") answer += event.text;
      else if (event.type === "tool") toolCalls.push({ name: event.name, args: event.args });
      else truncated = event.truncated;
    }
    return { answer, toolCalls, truncated };
  }

  private async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      switch (name) {
        case "check_service_health":
          return this.metrics.getServiceHealth(String(args.serviceName ?? ""));
        case "query_incident_kb": {
          const docs = await this.rag.search(String(args.query ?? ""));
          if (docs.length === 0) {
            return { results: [], note: "No post-mortem was similar enough to this query." };
          }
          return {
            results: docs.map((d) => ({
              file: d.file_name,
              relevance: `${(d.similarity * 100).toFixed(1)}%`,
              content: d.content,
            })),
          };
        }
        default:
          return { error: `Tool ${name} not implemented` };
      }
    } catch (e) {
      // Feed tool failures back to the model instead of failing the whole request.
      return { error: e instanceof Error ? e.message : "Tool execution failed" };
    }
  }
}
