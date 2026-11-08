import type { Dict } from "../nl";
/** Delen van de app die per taal apart staan: antwoordbrieven, rechten, privacy en "over". */
export type Extra = Pick<Dict, "reply" | "legal" | "privacyPage" | "aboutPage">;
