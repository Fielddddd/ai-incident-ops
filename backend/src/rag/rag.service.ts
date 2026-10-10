import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoogleGenAI } from "@google/genai";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants.js";
import { GEMINI_CLIENT } from "../gemini/gemini.constants.js";
import { withRetry } from "../common/retry.js";
import { detectLanguage, languageInstruction, type ReplyLanguage } from "../common/language.js";
import type { HistoryMessageDto } from "../common/history.dto.js";
import type { RagStreamEvent } from "../common/stream.js";

export interface MatchedDoc {
  file_name: string;
  content: string;
  similarity: number;
}

// Documents scoring below this are not used. Measured on this knowledge base with
// gemini-embedding-2-preview: clearly off-topic questions (cooking, geography, small talk)
// score 0.45-0.54, on-topic ones 0.63-0.86. Borderline questions from nearby domains (e.g.
// Kubernetes, 0.62) still pass, so the prompt's "answer only from the context" rule is the
// second line of defence. Scores are not calibrated: re-measure if the model or data changes.
export const MIN_SIMILARITY = 0.6;

const NOT_FOUND: Record<ReplyLanguage, string> = {
  Thai: "ไม่พบ post-mortem ที่เกี่ยวข้องกับคำถามนี้ในฐานความรู้ ลองอธิบายอาการหรือ service ที่ได้รับผลกระทบให้เจาะจงขึ้น",
  English:
    "No relevant post-mortem was found in the knowledge base for this question. Try describing the symptoms or the affected service in more detail.",
};

const SYSTEM_PROMPT = `You are an expert SRE and Incident Ops Assistant at a high-scale platform.
Use ONLY the provided post-mortem context below to answer the user's question accurately.
Provide root cause analysis and concrete mitigation/runbook advice based on past incidents.
If the answer is not contained in the context, state that no relevant post-mortem was found.`;

@Injectable()
export class RagService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(GEMINI_CLIENT) private readonly ai: GoogleGenAI,
  ) {}

  /** Closest post-mortems to `query`, best first, dropping anything below `minSimilarity`. */
  async search(query: string, matchCount = 2, minSimilarity = MIN_SIMILARITY) {
    const embedding = await withRetry(() =>
      this.ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: query,
        config: { outputDimensionality: 768 },
      }),
    );
    const queryEmbedding = embedding.embeddings?.[0]?.values;
    if (!queryEmbedding) {
      throw new ServiceUnavailableException("Failed to generate query embedding");
    }

    const { data, error } = await this.supabase.rpc("match_incident_documents", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });
    if (error) {
      throw new ServiceUnavailableException(`Vector match failed: ${error.message}`);
    }
    return ((data ?? []) as MatchedDoc[]).filter((d) => d.similarity >= minSimilarity);
  }

  /** Same answer as answer(), produced piece by piece: sources first, then text, then done. */
  async *answerStream(
    question: string,
    history: HistoryMessageDto[] = [],
  ): AsyncGenerator<RagStreamEvent> {
    // A follow-up like "what if that did not work?" has no searchable meaning alone,
    // so search with the previous user message as well.
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content;
    const docs = await this.search(lastUser ? `${lastUser}\n${question}` : question);

    yield {
      type: "sources",
      sources: docs.map((d) => ({ file: d.file_name, similarity: d.similarity })),
    };

    if (docs.length === 0) {
      // Nothing relevant: answer directly and skip the Gemini call.
      yield { type: "delta", text: NOT_FOUND[detectLanguage(question)] };
      yield { type: "done" };
      return;
    }

    const conversation = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const context = docs
      .map(
        (d) =>
          `[Source: ${d.file_name} | Similarity: ${(d.similarity * 100).toFixed(1)}%]\n${d.content}`,
      )
      .join("\n\n---\n\n");

    const stream = await withRetry(() =>
      this.ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nContext from past incidents:\n${context}${conversation ? `\n\nConversation so far:\n${conversation}` : ""}\n\nUser Question: ${question}\n\nProvide an incident assessment and actionable engineering recommendation.

${languageInstruction(detectLanguage(question))}`,
              },
            ],
          },
        ],
      }),
    );

    for await (const chunk of stream) {
      if (chunk.text) yield { type: "delta", text: chunk.text };
    }
    yield { type: "done" };
  }

  async answer(question: string, history: HistoryMessageDto[] = []) {
    let answer = "";
    let sources: { file: string; similarity: number }[] = [];
    for await (const event of this.answerStream(question, history)) {
      if (event.type === "sources") sources = event.sources;
      else if (event.type === "delta") answer += event.text;
    }
    return { answer, sources };
  }
}
