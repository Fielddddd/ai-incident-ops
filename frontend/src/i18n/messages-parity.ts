import en from "../../messages/en.json";
import th from "../../messages/th.json";

// Compile-time check only: fails type-checking if en.json and th.json have different keys.
export const _enMatchesTh: typeof th = en;
export const _thMatchesEn: typeof en = th;
