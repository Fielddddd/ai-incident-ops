import type { Source, ToolCall } from "./api";

export type Mode = "ask" | "agent";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  toolCalls?: ToolCall[];
  truncated?: boolean;
  error?: boolean;
  /** True while the reply is still arriving. */
  streaming?: boolean;
  /** Which mode produced this reply (decides the "working…" label). */
  mode?: Mode;
}
