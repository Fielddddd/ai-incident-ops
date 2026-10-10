// Reply language is decided in code (not left to the model): any Thai character => Thai, otherwise English.
export type ReplyLanguage = "Thai" | "English";

export function detectLanguage(text: string): ReplyLanguage {
  return /[฀-๿]/.test(text) ? "Thai" : "English";
}

export function languageInstruction(lang: ReplyLanguage): string {
  return `Write the entire reply in ${lang}. Keep technical terms, service names, file names and code unchanged.`;
}
