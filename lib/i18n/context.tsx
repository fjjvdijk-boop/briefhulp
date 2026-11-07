"use client";

import { createContext, useContext } from "react";
import { getDict, locale, type Dict } from "./index";

interface I18n {
  lang: string; // taal die de gebruiker koos (kan ook een niet-ingebouwde taal zijn)
  t: Dict; // teksten (ingebouwd, anders Engels)
  locale: string; // voor datums en bedragen
}

const Ctx = createContext<I18n>({ lang: "nl", t: getDict("nl"), locale: "nl-NL" });

export function I18nProvider({ lang, children }: { lang: string; children: React.ReactNode }) {
  const t = getDict(lang);
  return <Ctx.Provider value={{ lang, t, locale: locale(t.code === "en" && lang !== "en" ? "en" : lang) }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
