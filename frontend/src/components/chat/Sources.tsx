"use client";

import type { Source } from "@/lib/api";
import { useTranslations } from "next-intl";
import { DocIcon } from "../ui/Icons";

// "kb-incidentio-connection-pool.md" -> "incidentio-connection-pool"
const label = (file: string) => file.replace(/^kb-/, "").replace(/\.md$/, "");

export function Sources({ sources }: { sources: Source[] }) {
  const t = useTranslations();
  if (!sources.length) return null;
  return (
    <ul aria-label={t("sources")} className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <li
          key={s.file}
          title={`${s.file} (${(s.similarity * 100).toFixed(0)}%)`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs text-muted"
        >
          <DocIcon size={12} />
          {label(s.file)}
        </li>
      ))}
    </ul>
  );
}
