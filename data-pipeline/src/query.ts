import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// Initialize environment variables and service clients
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Helper function to handle transient API spikes (503 / 429)
async function generateWithRetry(
  fn: () => Promise<any>,
  retries = 3,
  delay = 2000,
): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 503 || error.status === 429)) {
      console.warn(
        `Model busy or rate-limited. Retrying in ${delay / 1000}s... (${retries} attempts left)`,
      );
      await new Promise((res) => setTimeout(res, delay));
      return generateWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function askIncidentOps(question: string) {
  console.log(`\nQuestion: "${question}"\nSearching relevant post-mortems...`);

  // 1. Generate 768-dimensional vector embedding for the input query
  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: question,
    config: {
      outputDimensionality: 768,
    },
  });

  const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
  if (!queryEmbedding) {
    throw new Error("Failed to generate query embedding");
  }

  // 2. Perform vector similarity search via Supabase RPC function (match top 2 documents)
  const { data: matchedDocs, error } = await supabase.rpc(
    "match_incident_documents",
    {
      query_embedding: queryEmbedding,
      match_count: 2,
    },
  );

  if (error) {
    throw new Error(`Vector match failed: ${error.message}`);
  }

  // Construct context payload from matched post-mortem records
  const context = matchedDocs
    .map(
      (doc: any) =>
        `[Source: ${doc.file_name} | Similarity: ${(doc.similarity * 100).toFixed(1)}%]\n${doc.content}`,
    )
    .join("\n\n---\n\n");

  // 3. Formulate prompt with retrieved incident context
  const systemPrompt = `You are an expert SRE and Incident Ops Assistant at a high-scale platform.
Use ONLY the provided post-mortem context below to answer the user's question accurately.
Provide root cause analysis and concrete mitigation/runbook advice based on past incidents.
If the answer is not contained in the context, state that no relevant post-mortem was found.`;

  const userPrompt = `Context from past incidents:
${context}

User Question: ${question}

Provide an incident assessment and actionable engineering recommendation:`;

  // Use gemini-3.5-flash-lite with retry logic for high availability
  const chatResponse = await generateWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
      ],
    }),
  );

  // Display retrieved reference sources
  console.log("\n--- Retrieved Context Sources ---");
  matchedDocs.forEach((d: any) => {
    console.log(`- ${d.file_name} (${(d.similarity * 100).toFixed(1)}% match)`);
  });

  // Display synthesized response
  console.log("\n--- AI Ops Assistant Response ---");
  console.log(chatResponse.text);
}

// Test query simulating an active production incident
const testQuestion =
  "We are seeing database connection pool exhaustion across multiple API endpoints. What could be the cause and how do we resolve it?";

askIncidentOps(testQuestion);
