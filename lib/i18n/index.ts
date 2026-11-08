import { nl, type Dict, type Lang } from "./nl";
import { en } from "./en";

export type { Dict };

/** Eén taal uit de complete lijst (zie scripts/make-languages.mjs). */
export interface LangInfo {
  c: string; // taalcode
  en: string; // Engelse naam
  n?: string; // naam in de taal zelf
  nl?: string; // Nederlandse naam
  rtl?: number;
}

/** Talen die helemaal zijn ingebouwd: de hele app én de gratis uitleg, offline en gratis. */
export const BUILT_IN: Record<string, { name: string; dir: "ltr" | "rtl" }> = {
  nl: { name: "Nederlands", dir: "ltr" },
  en: { name: "English", dir: "ltr" },
  ar: { name: "العربية", dir: "rtl" },
  tr: { name: "Türkçe", dir: "ltr" },
  pl: { name: "Polski", dir: "ltr" },
  uk: { name: "Українська", dir: "ltr" },
  ru: { name: "Русский", dir: "ltr" },
  ro: { name: "Română", dir: "ltr" },
  es: { name: "Español", dir: "ltr" },
  fr: { name: "Français", dir: "ltr" },
  fa: { name: "فارسی", dir: "rtl" },
  so: { name: "Soomaali", dir: "ltr" },
  pt: { name: "Português", dir: "ltr" },
};

/**
 * Alleen Nederlands en Engels zitten altijd in de app. De andere ingebouwde talen (en hun extra teksten)
 * worden pas geladen als iemand die taal kiest: een veel kleinere app, sneller op oude telefoons.
 */
const LOADED: Record<string, Lang> = { nl, en };
const LANG_LOADERS: Record<string, () => Promise<Lang>> = {
  ar: () => import("./ar").then((m) => m.ar),
  tr: () => import("./tr").then((m) => m.tr),
  pl: () => import("./pl").then((m) => m.pl),
  uk: () => import("./uk").then((m) => m.uk),
  ru: () => import("./ru").then((m) => m.ru),
  ro: () => import("./ro").then((m) => m.ro),
  es: () => import("./es").then((m) => m.es),
  fr: () => import("./fr").then((m) => m.fr),
  fa: () => import("./fa").then((m) => m.fa),
  so: () => import("./so").then((m) => m.so),
  pt: () => import("./pt").then((m) => m.pt),
};

export function registerLang(code: string, lang: Lang) {
  LOADED[code] = lang;
}

/** Is deze taal (met extra teksten) klaar om te tonen? */
export function isLangReady(code: string) {
  if (!BUILT_IN[code]) return true;
  return !!LOADED[code] && (!EXTRA_LOADERS[code] || !!EXTRA[code]);
}
export const BUILT_IN_ORDER = ["nl", "en", "ar", "tr", "pl", "uk", "ru", "ro", "es", "fr", "fa", "so", "pt"];

/**
 * Alle talen van de wereld met een ISO 639-1-code (± 180). De naam wordt door de browser zelf in die taal geschreven.
 * Talen die niet zijn ingebouwd: de knoppen zijn Engels; de AI-uitleg (als die aan staat) komt in die taal.
 */
export const ALL_LANGUAGE_CODES = (
  "aa ab af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu " +
  "fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km " +
  "kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or " +
  "os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt " +
  "tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu"
).split(" ");

// Extra talen die in Nederland veel gesproken worden maar geen 2-letterige code hebben
export const EXTRA_LANGUAGE_CODES = ["pap", "srn", "tzm", "ber", "prs", "ckb", "kmr", "yue", "fil"];

export function isBuiltIn(code: string) {
  return code in BUILT_IN;
}

function merge<T>(base: T, over: Partial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)
        ? merge(b, v as Partial<typeof b>)
        : v;
  }
  return out as T;
}

/** Woordenboek voor een taal. Niet-ingebouwde talen krijgen Engels; ontbrekende stukken vallen terug op Engels. */
/**
 * Rechten, antwoordbrieven, privacy en "over" staan per taal in lib/i18n/extra/<taal>.ts. Die worden pas
 * geladen als de taal gekozen is (kleinere app). Tot die tijd: Engels als reserve.
 */
const EXTRA: Record<string, Partial<Dict>> = {};
const EXTRA_LOADERS: Record<string, () => Promise<{ extra: Partial<Dict> }>> = {
  ar: () => import("./extra/ar"),
  tr: () => import("./extra/tr"),
  pl: () => import("./extra/pl"),
  uk: () => import("./extra/uk"),
  ru: () => import("./extra/ru"),
  ro: () => import("./extra/ro"),
  es: () => import("./extra/es"),
  fr: () => import("./extra/fr"),
  fa: () => import("./extra/fa"),
  so: () => import("./extra/so"),
  pt: () => import("./extra/pt"),
};
export const EXTRA_LANGS = Object.keys(EXTRA_LOADERS);

export function registerExtra(code: string, extra: Partial<Dict>) {
  EXTRA[code] = extra;
}

/** Laadt de extra teksten van een taal. Geeft true als er iets nieuws geladen is. */
export async function loadExtra(code: string): Promise<boolean> {
  if (isLangReady(code)) return false;
  try {
    const [base, extra] = await Promise.all([
      LOADED[code] ? Promise.resolve(LOADED[code]) : LANG_LOADERS[code](),
      EXTRA[code] ? Promise.resolve({ extra: EXTRA[code] }) : EXTRA_LOADERS[code](),
    ]);
    LOADED[code] = base;
    EXTRA[code] = extra.extra;
    return true;
  } catch {
    return false;
  }
}

export function getDict(code: string): Dict {
  const lang = LOADED[code];
  if (code === "nl") return nl;
  if (!lang) return en;
  return merge(merge(en, lang as Partial<Dict>), EXTRA[code]);
}

const RTL = new Set(["ar", "fa", "he", "ur", "ps", "yi", "dv", "ug", "ckb", "sd", "prs", "syr", "aii", "arc", "ks", "ug", "nqo", "ff-Adlm"]);
export function isRtl(code: string) {
  if (RTL.has(code)) return true;
  try {
    const script = new Intl.Locale(code).maximize().script ?? "";
    return ["Arab", "Hebr", "Thaa", "Syrc", "Nkoo", "Adlm", "Rohg"].includes(script);
  } catch {
    return false;
  }
}

/** Naam van een taal in die taal zelf ("Deutsch", "日本語"), met de Engelse naam als reserve. */
export function nativeName(code: string): string {
  if (BUILT_IN[code]) return BUILT_IN[code].name;
  try {
    const n = new Intl.DisplayNames([code], { type: "language" }).of(code);
    if (n && n !== code) return n.charAt(0).toLocaleUpperCase(code) + n.slice(1);
  } catch {
    /* onbekende code */
  }
  return englishName(code);
}

export function englishName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Locale voor datums en bedragen. */
export function locale(code: string) {
  return code === "nl" ? "nl-NL" : code;
}

/** Beste gok uit de taal van de telefoon. */
export function guessLanguage(): string {
  if (typeof navigator === "undefined") return "nl";
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split("-")[0];
    if (BUILT_IN[base]) return base;
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split("-")[0];
    if (ALL_LANGUAGE_CODES.includes(base)) return base;
  }
  return "nl";
}

export const LANGUAGE_CODE_RE = /^[a-z]{2,3}$/;
