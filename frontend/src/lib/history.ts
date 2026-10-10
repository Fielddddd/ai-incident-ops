import type { HistoryItem } from "./api";
import type { ChatMessage } from "./types";

const MAX_HISTORY = 10;

// Earlier turns sent to the backend so follow-up questions keep their context.
// Failed turns (the error reply and the question that caused it) are left out.
export function buildHistory(messages: ChatMessage[]): HistoryItem[] {
  const skip = new Set<number>();
  messages.forEach((m, i) => {
    if (m.error) {
      skip.add(i);
      if (messages[i - 1]?.role === "user") skip.add(i - 1);
    }
  });
  const items = messages
    .filter((_, i) => !skip.has(i))
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  while (items[0]?.role === "assistant") items.shift();
  return items;
}
