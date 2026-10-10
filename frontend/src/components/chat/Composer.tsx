"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Mode } from "@/lib/types";
import { SendIcon } from "../ui/Icons";

interface Props {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}

export function Composer({ mode, onModeChange, value, onChange, onSend, loading }: Props) {
  const t = useTranslations();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content, up to a cap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const modes = [
    { id: "ask" as const, label: t("modeAskShort"), hint: t("askHint") },
    { id: "agent" as const, label: t("modeAgentShort"), hint: t("agentHint") },
  ];
  const canSend = value.trim().length > 0 && !loading;

  return (
    <div className="px-4 pb-3 pt-2 sm:px-5">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("modeLabel")}>
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              aria-pressed={mode === m.id}
              onClick={() => onModeChange(m.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                mode === m.id
                  ? "border-action bg-action text-action-ink"
                  : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          ))}
          <span className="text-xs text-muted">{modes.find((m) => m.id === mode)!.hint}</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) onSend();
          }}
          className="flex items-end gap-2 rounded-3xl border border-line bg-panel py-1.5 pl-4 pr-1.5 shadow-sm focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15"
        >
          <label htmlFor="chat-input" className="sr-only">
            {t("placeholder")}
          </label>
          <textarea
            id="chat-input"
            ref={ref}
            rows={1}
            value={value}
            maxLength={1000}
            placeholder={t("placeholder")}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line. Ignore Enter while a Thai/IME composition is open.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed outline-none placeholder:text-muted/80"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t("send")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-action text-action-ink transition-opacity disabled:opacity-30"
          >
            <SendIcon size={16} />
          </button>
        </form>

        <p className="mt-2 text-center text-[0.7rem] text-muted">
          {t("disclaimer")}
          {mode === "agent" && <> {t("mockNote")}</>}
        </p>
      </div>
    </div>
  );
}
