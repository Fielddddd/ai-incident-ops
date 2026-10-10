import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";

// Initialize Supabase and Google Gen AI clients
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// --- 1. Define SRE Tool Implementations ---

// Mock telemetry metrics for internal services
const serviceMetrics: Record<string, any> = {
  database: {
    status: "DEGRADED",
    latencyMs: 820,
    activeConnections: 98,
    maxConnections: 100,
    errorRatePct: 4.8,
  },
  "api-gateway": {
    status: "HEALTHY",
    latencyMs: 35,
    activeConnections: 120,
    maxConnections: 2000,
    errorRatePct: 0.01,
  },
  "auth-service": {
    status: "HEALTHY",
    latencyMs: 50,
    activeConnections: 45,
    maxConnections: 500,
    errorRatePct: 0.0,
  },
};

// Tool 1: Check live service telemetry status
async function checkServiceHealth(args: { serviceName: string }) {
  const service = serviceMetrics[args.serviceName.toLowerCase()];
  if (!service) {
    return {
      error: `Service "${args.serviceName}" not recognized. Available services: ${Object.keys(serviceMetrics).join(", ")}`,
    };
  }
  return {
    service: args.serviceName,
    ...service,
    timestamp: new Date().toISOString(),
  };
}

// Tool 2: Perform RAG similarity search against historical post-mortems
async function queryIncidentKb(args: { query: string }) {
  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: args.query,
    config: {
      outputDimensionality: 768,
    },
  });

  const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
  if (!queryEmbedding) {
    return { error: "Failed to generate embedding for incident search" };
  }

  const { data: matchedDocs, error } = await supabase.rpc(
    "match_incident_documents",
    {
      query_embedding: queryEmbedding,
      match_count: 2,
    },
  );

  if (error) {
    return { error: `Database search failed: ${error.message}` };
  }

  return {
    results: matchedDocs.map((doc: any) => ({
      file: doc.file_name,
      relevance: `${(doc.similarity * 100).toFixed(1)}%`,
      content: doc.content,
    })),
  };
}

// Map tool names to their execution functions
const toolExecutors: Record<string, (args: any) => Promise<any>> = {
  check_service_health: checkServiceHealth,
  query_incident_kb: queryIncidentKb,
};

// --- 2. Declare Tool Schemas for Gemini ---

const checkServiceHealthDeclaration: FunctionDeclaration = {
  name: "check_service_health",
  description:
    "Inspects real-time runtime metrics, latency, and operational health of a backend service.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceName: {
        type: Type.STRING,
        description:
          'Name of the service (e.g., "database", "api-gateway", "auth-service").',
      },
    },
    required: ["serviceName"],
  },
};

const queryIncidentKbDeclaration: FunctionDeclaration = {
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
};

// --- 3. Agent Execution Loop with Tool Calling ---

async function runIncidentOpsAgent(prompt: string) {
  console.log(`\n========================================`);
  console.log(`Operator Request: "${prompt}"`);
  console.log(`========================================\n`);

  const messages: any[] = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const systemInstruction = `You are an automated Site Reliability Engineer (SRE) Assistant for high-throughput production infrastructure.
You have access to tools for checking live telemetry metrics and searching historical incident post-mortems.
If an operator reports high latency or degraded performance, check the service health first.
If a service is degraded or failing, search the knowledge base for matching historical post-mortems and provide immediate remediation steps.`;

  // First turn: Send user query with declared tools
  let response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: messages,
    config: {
      systemInstruction,
      tools: [
        {
          functionDeclarations: [
            checkServiceHealthDeclaration,
            queryIncidentKbDeclaration,
          ],
        },
      ],
    },
  });

  // Handle iterative tool calls
  while (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0]!;
    console.log(
      `🤖 Agent invoked Tool: [${call.name}] with arguments:`,
      call.args,
    );

    const executor = toolExecutors[call.name ?? ""];
    let toolResult: any;

    if (executor) {
      toolResult = await executor(call.args);
    } else {
      toolResult = { error: `Tool ${call.name} not implemented` };
    }

    console.log(`✓ Tool Result received.`);

    // Append model's tool call intent to conversation history
    messages.push(response.candidates![0]!.content);

    // Append tool execution response using 'user' role
    messages.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: call.name,
            response: { output: toolResult },
          },
        },
      ],
    });

    // Request subsequent step from model with tool result provided
    response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: messages,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              checkServiceHealthDeclaration,
              queryIncidentKbDeclaration,
            ],
          },
        ],
      },
    });
  }

  console.log("\n--- Final Agent Response ---");
  console.log(response.text);
}

// Test scenario: Operator alerts about latency and asks for investigation
const testScenario =
  "Customers are reporting timeouts when calling the API. Can you check the database health and advise on remediation if an issue exists?";

runIncidentOpsAgent(testScenario);
