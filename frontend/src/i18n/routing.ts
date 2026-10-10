import { defineRouting } from "next-intl/routing";

// URLs look like /th and /en. Opening "/" redirects to the best match (default: th).
export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
});

export type Locale = (typeof routing.locales)[number];
