"use client";

import type { ToolCall } from "@/lib/api";
import { useTranslations } from "next-intl";

export function TraceRail({ calls }: { calls: ToolCall[] }) {
  const t = useTranslations();
  if (!calls.length) return null;
  return (
    <section aria-label={t("agentTrace")} className="mb-4 border-b border-line pb-4">
      <h3 className="text-xs font-semibold text-muted">{t("agentTrace")}</h3>
      <ol className="mt-2 border-l-2 border-line pl-4">
        {calls.map((c, i) => (
          <li key={i} className="relative pb-3 last:pb-0">
            <span
              className="absolute -left-[calc(1rem+5px)] top-1.5 h-2 w-2 rounded-full bg-ink"
              aria-hidden
            />
            <p className="text-sm font-medium">{t.has(`tools.${c.name}` as never) ? t(`tools.${c.name}` as never) : c.name}</p>
            <p className="mt-0.5 break-words font-mono text-xs text-muted">
              {c.name}({Object.values(c.args).map((v) => JSON.stringify(v)).join(", ")})
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
