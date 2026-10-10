"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/types";
import { BotIcon, CheckIcon, CopyIcon, RefreshIcon, ThumbDownIcon, ThumbUpIcon } from "../ui/Icons";
import { Sources } from "./Sources";
import { TraceRail } from "./TraceRail";

function Avatar() {
  return (
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-action-ink" aria-hidden>
      <BotIcon size={15} />
    </span>
  );
}

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-ink px-4 py-2.5 text-sm font-medium text-action-ink">
        {message.content}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-paper ${
        pressed ? "text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function AssistantMessage({
  message,
  isLast,
  onRegenerate,
}: {
  message: ChatMessage;
  isLast: boolean;
  onRegenerate: () => void;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  // Feedback is kept only in this page for now; nothing is sent to the backend.
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div className="min-w-0 max-w-[92%]">
        <div
          className={`rounded-2xl border px-4 py-3 ${
            message.error ? "border-warn/40 text-warn" : "border-line bg-panel"
          }`}
        >
          {message.toolCalls && <TraceRail calls={message.toolCalls} />}
          {message.error ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <>
              {message.content && (
                <div className="answer max-w-[72ch]">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
              {message.streaming && !message.content && (
                <p className="text-sm text-muted">
                  {t(message.mode === "agent" ? "agentBusy" : "askBusy")}
                </p>
              )}
            </>
          )}
          {message.truncated && <p className="mt-3 text-sm text-warn">{t("truncated")}</p>}
        </div>
        {message.sources && <Sources sources={message.sources} />}
        <div className={`mt-2 flex items-center gap-0.5 ${message.streaming ? "hidden" : ""}`}>
          {!message.error && (
            <>
              <IconButton label={copied ? t("copied") : t("copy")} onClick={copy}>
                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              </IconButton>
              <IconButton
                label={t("helpful")}
                pressed={vote === "up"}
                onClick={() => setVote(vote === "up" ? null : "up")}
              >
                <ThumbUpIcon size={14} />
              </IconButton>
              <IconButton
                label={t("notHelpful")}
                pressed={vote === "down"}
                onClick={() => setVote(vote === "down" ? null : "down")}
              >
                <ThumbDownIcon size={14} />
              </IconButton>
            </>
          )}
          {isLast && (
            <IconButton label={t("regenerate")} onClick={onRegenerate}>
              <RefreshIcon size={14} />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
