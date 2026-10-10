"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, { label: string; name: string }> = {
  th: { label: "TH", name: "ภาษาไทย" },
  en: { label: "EN", name: "English" },
};

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="Language"
      aria-busy={pending}
      className="inline-flex rounded-lg border border-line p-0.5 text-xs"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          // Same page, other language: /th -> /en
          onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
          aria-pressed={locale === l}
          aria-label={LABELS[l].name}
          className={`rounded-md px-2 py-1 font-medium transition-colors ${
            locale === l ? "bg-action text-action-ink" : "text-muted hover:text-ink"
          }`}
        >
          {LABELS[l].label}
        </button>
      ))}
    </div>
  );
}
