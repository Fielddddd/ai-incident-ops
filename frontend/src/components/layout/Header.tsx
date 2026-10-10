"use client";

import { useTranslations } from "next-intl";
import { BackendStatus } from "./BackendStatus";
import { BotIcon, RefreshIcon } from "../ui/Icons";
import { LanguageToggle } from "./LanguageToggle";

export function Header({ onNewChat, canReset }: { onNewChat: () => void; canReset: boolean }) {
  const t = useTranslations();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-action-ink">
          <BotIcon size={18} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight">{t("title")}</h1>
          <BackendStatus />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <button
          type="button"
          onClick={onNewChat}
          disabled={!canReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RefreshIcon size={14} />
          {t("newChat")}
        </button>
      </div>
    </header>
  );
}
