// Gedeelde types tussen server (analyse) en client (weergave).

export type Urgency = "rood" | "oranje" | "groen";

export type SenderType =
  | "belastingdienst"
  | "toeslagen"
  | "gemeente"
  | "zorgverzekeraar"
  | "verzekeraar"
  | "incassobureau"
  | "deurwaarder"
  | "cjib"
  | "rechtbank"
  | "uwv"
  | "svb"
  | "duo"
  | "bank"
  | "energie"
  | "woning"
  | "zorg"
  | "werk"
  | "school"
  | "overig";

export interface Analysis {
  is_letter: boolean;
  readable: boolean;
  photo_tip: string | null;
  sender: { name: string; type: SenderType };
  letter_type: string;
  headline: string;
  summary: string;
  urgency: { level: Urgency; reason: string };
  actions: { step: string; detail: string | null }[];
  deadline: {
    date: string | null; // YYYY-MM-DD
    what: string | null;
    is_estimate: boolean;
  };
  amounts: { amount: string; description: string }[];
  payment: {
    needed: boolean;
    amount: string | null;
    iban: string | null;
    to: string | null;
    reference: string | null;
  };
  references: { label: string; value: string }[];
  contact: {
    phone: string | null;
    website: string | null;
    email: string | null;
  };
  objection: {
    possible: boolean;
    deadline: string | null;
    how: string | null;
  };
  if_you_do_nothing: string | null;
  difficult_words: { word: string; meaning: string }[];
  scam_check: { suspicious: boolean; signals: string[] };
  help: { name: string; why: string; contact: string | null }[];
}

export type ExplainLanguage = string; // ISO 639-code, bijv. "nl", "ar", "ti"

export const LANGUAGES: { code: string; label: string; prompt: string; rtl?: boolean }[] = [
  { code: "nl", label: "Nederlands", prompt: "eenvoudig Nederlands op B1-niveau" },
  { code: "en", label: "English", prompt: "simple English (CEFR B1)" },
  { code: "tr", label: "Türkçe", prompt: "eenvoudig Turks (Türkçe, B1-niveau)" },
  { code: "ar", label: "العربية", prompt: "eenvoudig Modern Standaard Arabisch (B1-niveau)", rtl: true },
  { code: "pl", label: "Polski", prompt: "eenvoudig Pools (B1-niveau)" },
  { code: "uk", label: "Українська", prompt: "eenvoudig Oekraïens (B1-niveau)" },
  { code: "ti", label: "ትግርኛ (Tigrinya)", prompt: "eenvoudig Tigrinya (B1-niveau)" },
  { code: "so", label: "Soomaali", prompt: "eenvoudig Somalisch (B1-niveau)" },
  { code: "es", label: "Español", prompt: "eenvoudig Spaans (B1-niveau)" },
];

export interface UploadPage {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  data: string; // base64 zonder data:-prefix
}

export interface AnalyseRequest {
  pages: UploadPage[];
  language: ExplainLanguage;
  today: string; // YYYY-MM-DD, datum op het toestel van de gebruiker
}

export interface QuestionRequest {
  analysis: Analysis;
  question: string;
  language: ExplainLanguage;
  history: { q: string; a: string }[];
}
