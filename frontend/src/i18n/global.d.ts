import type { Locale } from "./routing";
import type messages from "../../messages/th.json";

// Makes t("...") keys type-checked against messages/th.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
