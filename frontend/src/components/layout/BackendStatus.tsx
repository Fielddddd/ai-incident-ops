"use client";

import { useEffect, useState } from "react";
import { checkBackend } from "@/lib/api";
import { useTranslations } from "next-intl";

export function BackendStatus() {
  const t = useTranslations();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = () => checkBackend().then((ok) => alive && setOnline(ok));
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const label = online === null ? t("apiChecking") : online ? t("apiOnline") : t("apiOffline");
  const color = online === null ? "bg-muted" : online ? "bg-ok" : "bg-warn";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  );
}
