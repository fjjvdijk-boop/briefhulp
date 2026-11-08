"use client";
// Vertalingen van de kennisbank en de stappenplannen. Per taal een apart bestand (lib/legal/tr/<taal>.ts),
// dat pas wordt geladen als die taal gekozen is. Sleutel = de Engelse tekst (of de Nederlandse naam
// van een organisatie). Talen die de telefoon zelf vertaalt, krijgen deze teksten mee in translateApp.
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/context";
import { loadCachedTranslation } from "../i18n/autotranslate";
import KEYS from "./tr/keys.json";

export type LegalMap = Record<string, string>;
type T = { nl: string; en: string };

const LOADERS: Record<string, () => Promise<{ default: LegalMap }>> = {
  ar: () => import("./tr/ar"),
  tr: () => import("./tr/tr"),
  pl: () => import("./tr/pl"),
  uk: () => import("./tr/uk"),
  ru: () => import("./tr/ru"),
  ro: () => import("./tr/ro"),
  es: () => import("./tr/es"),
  fr: () => import("./tr/fr"),
  fa: () => import("./tr/fa"),
  so: () => import("./tr/so"),
  pt: () => import("./tr/pt"),
};

export const LEGAL_LANGS = Object.keys(LOADERS);
export const LEGAL_KEYS: string[] = KEYS;

const cache: Record<string, LegalMap | null> = {};

function fromAuto(lang: string): LegalMap | null {
  const flat = loadCachedTranslation(lang);
  if (!flat) return null;
  const m: LegalMap = {};
  LEGAL_KEYS.forEach((k, i) => {
    const v = flat[`legal#${i}`];
    if (v) m[k] = v;
  });
  return Object.keys(m).length ? m : null;
}

export function loadLegal(lang: string): Promise<LegalMap | null> {
  if (lang in cache) return Promise.resolve(cache[lang]);
  const load = LOADERS[lang];
  if (!load) {
    cache[lang] = typeof window === "undefined" ? null : fromAuto(lang);
    return Promise.resolve(cache[lang]);
  }
  return load()
    .then((m) => (cache[lang] = m.default))
    .catch(() => null);
}

/** Vertaalt kennisbank-teksten naar de gekozen taal. Ontbreekt een vertaling, dan Engels. */
export function useLegalText() {
  const { lang: code } = useI18n();
  const [map, setMap] = useState<LegalMap | null>(() => cache[code] ?? null);
  useEffect(() => {
    let live = true;
    if (code === "nl" || code === "en") return setMap(null);
    loadLegal(code).then((m) => live && setMap(m));
    return () => {
      live = false;
    };
  }, [code]);
  const nl = code === "nl";
  const tx = (x: T) => (nl ? x.nl : map?.[x.en] ?? x.en);
  return {
    tx,
    list: (x: { nl: string[]; en: string[] }) => (nl ? x.nl : x.en.map((s) => map?.[s] ?? s)),
    name: (s: string) => (nl ? s : map?.[s] ?? EN_NAMES[s] ?? s),
    /** Taal waarin de teksten nu echt staan (voor lang= en de voorleesstem). */
    lang: nl ? "nl" : code === "en" || map ? code : "en",
    /** true als de teksten nog in het Engels staan terwijl de gebruiker een andere taal koos. */
    fallback: !nl && code !== "en" && !map,
  };
}

const EN_NAMES: Record<string, string> = {
  "Het Juridisch Loket (gratis advies)": "Het Juridisch Loket (free advice)",
  "Rekentool beslagvrije voet": "Calculator for the protected income (beslagvrije voet)",
  "Uw gemeente of belastingkantoor": "Your municipality or tax office",
  "Uw gemeente": "Your municipality",
  "SKGZ (zorgverzekering)": "SKGZ (health insurance)",
};
