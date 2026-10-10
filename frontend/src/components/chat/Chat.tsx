"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { useTranslations } from "next-intl";
import { Header } from "../layout/Header";
import { InfoIcon } from "../ui/Icons";
import { Composer } from "./Composer";
import { AssistantMessage, UserMessage } from "./Message";

export function Chat() {
  const t = useTranslations();
  const { mode, setMode, text, setText, loading, messages, send, regenerate, reset } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow the answer as it streams in, unless the reader has scrolled up to read.
  useEffect(() => {
    if (messages[messages.length - 1]?.role === "user") stickToBottom.current = true;
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);

  const examples =
    mode === "ask"
      ? [t("examples.ask.pool"), t("examples.ask.ttl"), t("examples.ask.overflow")]
      : [t("examples.agent.timeout"), t("examples.agent.auth")];
  const followUps =
    mode === "ask"
      ? [t("followUpItems.prevent"), t("followUpItems.steps"), t("followUpItems.alerts")]
      : [t("followUpItems.gateway"), t("followUpItems.prevent"), t("followUpItems.steps")];
  const last = messages[messages.length - 1];
  const showFollowUps = !loading && last?.role === "assistant" && !last.error;

  return (
    <div className="flex h-dvh flex-col bg-panel">
      <Header onNewChat={reset} canReset={messages.length > 0 && !loading} />

      <div
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="mx-auto mb-6 flex w-fit items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted">
            <InfoIcon size={12} />
            {t("notSaved")}
          </p>

          {messages.length === 0 ? (
            <section className="pt-4">
              <h2 className="text-xl font-bold tracking-tight">{t("tagline")}</h2>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted">{t("intro")}</p>
              <p className="mt-6 text-xs font-medium text-muted">{t("tryAsking")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <li key={ex}>
                    <button
                      type="button"
                      onClick={() => send(ex)}
                      className="rounded-xl border border-line px-3 py-1.5 text-left text-sm transition-colors hover:bg-paper"
                    >
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            // aria-busy makes screen readers wait for the finished answer instead of reading every word.
            <div className="space-y-5" aria-live="polite" aria-busy={loading}>
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={m.id} message={m} />
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    isLast={i === messages.length - 1 && !loading}
                    onRegenerate={regenerate}
                  />
                ),
              )}
              {showFollowUps && (
                <div className="pl-11">
                  <p className="text-xs text-muted">{t("followUps")}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {followUps.map((f) => (
                      <li key={f}>
                        <button
                          type="button"
                          onClick={() => send(f)}
                          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-paper"
                        >
                          {f}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <Composer
        mode={mode}
        onModeChange={setMode}
        value={text}
        onChange={setText}
        onSend={() => send()}
        loading={loading}
      />
    </div>
  );
}
