"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { StreamInterruptedError, streamAgent, streamAsk, type StreamEvent } from "@/lib/api";
import { buildHistory } from "@/lib/history";
import type { ChatMessage, Mode } from "@/lib/types";

let nextId = 0;
const newId = () => String(++nextId);

export function useChat() {
  const t = useTranslations();
  const [mode, setMode] = useState<Mode>("ask");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Leaving the page cancels a reply that is still arriving.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Appends the question to `base`, adds an empty reply, and fills the reply in as the backend streams.
  async function run(input: string, base: ChatMessage[]) {
    const history = buildHistory(base);
    const replyId = newId();
    setMessages([
      ...base,
      { id: newId(), role: "user", content: input },
      { id: replyId, role: "assistant", content: "", streaming: true, mode },
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const update = (change: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === replyId ? change(m) : m)));

    const onEvent = (event: StreamEvent) => {
      switch (event.type) {
        case "sources":
          update((m) => ({ ...m, sources: event.sources }));
          break;
        case "tool":
          update((m) => ({
            ...m,
            toolCalls: [...(m.toolCalls ?? []), { name: event.name, args: event.args }],
          }));
          break;
        case "delta":
          update((m) => ({ ...m, content: m.content + event.text }));
          break;
        case "done":
          update((m) => ({ ...m, streaming: false, truncated: event.truncated ?? false }));
          break;
      }
    };

    try {
      const stream = mode === "ask" ? streamAsk : streamAgent;
      await stream(input, history, onEvent, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      const content =
        err instanceof StreamInterruptedError
          ? t("streamInterrupted")
          : err instanceof TypeError
            ? t("networkError")
            : (err as Error).message;
      // The partial reply is replaced by the error, so a half answer is never shown as complete.
      update((m) => ({
        id: m.id,
        role: "assistant",
        content,
        error: true,
        streaming: false,
      }));
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  function send(input = text) {
    const q = input.trim();
    if (!q || loading) return;
    setText("");
    run(q, messages);
  }

  // Re-asks the last question, dropping the reply being replaced.
  function regenerate() {
    if (loading) return;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx < 0) return;
    run(messages[lastUserIdx]!.content, messages.slice(0, lastUserIdx));
  }

  function reset() {
    setMessages([]);
    setText("");
  }

  return { mode, setMode, text, setText, loading, messages, send, regenerate, reset };
}
