// Automatisch vertalen naar ELKE taal die de telefoon kent, met de ingebouwde vertaler van de browser
// (Chrome "Translator API"). Dat gebeurt op het toestel zelf: gratis, en er gaat geen tekst naar een server.
// Het resultaat wordt bewaard, zodat het maar één keer hoeft.
import { en } from "./en";
import type { Dict } from "./nl";

const VERSION = 3; // ophogen als de teksten veranderen
const KEY = (lang: string) => `briefhulp:dict:${lang}:v${VERSION}`;

interface TranslatorLike {
  translate(text: string): Promise<string>;
  destroy?: () => void;
}
interface TranslatorStatic {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(o: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<TranslatorLike>;
}

/** Geeft na `ms` een fout als de browser niet antwoordt (sommige versies blijven hangen). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function api(): TranslatorStatic | null {
  const g = globalThis as unknown as { Translator?: TranslatorStatic };
  return g.Translator ?? null;
}

/** "ja" als deze telefoon zelf naar deze taal kan vertalen (eventueel na een eenmalige download). */
export async function canAutoTranslate(lang: string): Promise<boolean> {
  const T = api();
  if (!T) return false;
  try {
    const a = await withTimeout(T.availability({ sourceLanguage: "en", targetLanguage: lang }), 4000);
    return a !== "unavailable" && a !== "no";
  } catch {
    return false;
  }
}

// ---------- Woordenboek plat maken en weer opbouwen ----------
// Functies (zoals "Nog {0} dagen") worden als sjabloon vertaald. Voor functies waarvan de tekst
// verandert door de invoer (bijv. wel/geen datum) maken we per variant een apart sjabloon.
type Probe = { key: string; args: unknown[] };
const P = (i: number) => `{${i}}`;

const VARIANTS: Record<string, Probe[]> = {
  "result.stepLabel": [
    { key: "1", args: [P(0), true] },
    { key: "0", args: [P(0), false] },
  ],
  "r.hlPay": [
    { key: "1", args: [P(0), P(1), P(2)] },
    { key: "0", args: [P(0), P(1), null] },
  ],
  "r.objectionTerm": (["weken", "dagen", "maanden"] as const).map((u) => ({ key: u, args: [P(0), u] })),
  "r.payParts": [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => ({
    key: String(mask),
    args: [mask & 1 ? P(0) : null, mask & 2 ? P(1) : null, mask & 4 ? P(2) : null],
  })),
};

function variantKey(path: string, args: unknown[]): string {
  if (path === "result.stepLabel") return args[1] ? "1" : "0";
  if (path === "r.hlPay") return args[2] ? "1" : "0";
  if (path === "r.objectionTerm") return String(args[1]);
  if (path === "r.payParts") return String((args[0] ? 1 : 0) | (args[1] ? 2 : 0) | (args[2] ? 4 : 0));
  return "x";
}

type Flat = Record<string, string>; // pad (+ #variant) → tekst of sjabloon

function flatten(obj: unknown, path: string, out: Flat) {
  if (typeof obj === "string") {
    out[path] = obj;
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
  } else if (typeof obj === "function") {
    const probes = VARIANTS[path] ?? [{ key: "x", args: Array.from({ length: Math.max(1, obj.length) }, (_, i) => P(i)) }];
    for (const p of probes) {
      try {
        const r = (obj as (...a: unknown[]) => unknown)(...p.args);
        if (typeof r === "string") out[`${path}#${p.key}`] = r;
      } catch {
        /* overslaan */
      }
    }
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (path === "" && (k === "code" || k === "name" || k === "dir")) continue;
      flatten(v, path ? `${path}.${k}` : k, out);
    }
  }
}

function fill(tpl: string, args: unknown[]) {
  return tpl.replace(/\{(\d)\}/g, (_, i) => (args[+i] == null ? "" : String(args[+i])));
}

function rebuild(base: unknown, path: string, tr: Flat): unknown {
  if (typeof base === "string") return tr[path] ?? base;
  if (Array.isArray(base)) return base.map((v, i) => rebuild(v, `${path}[${i}]`, tr));
  if (typeof base === "function") {
    const fn = base as (...a: unknown[]) => unknown;
    return (...args: unknown[]) => {
      const tpl = tr[`${path}#${variantKey(path, args)}`];
      return tpl ? fill(tpl, args) : fn(...args);
    };
  }
  if (base && typeof base === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(base)) o[k] = rebuild(v, path ? `${path}.${k}` : k, tr);
    return o;
  }
  return base;
}

/** Bouwt een woordenboek uit een (bewaarde) vertaling. Engels als reserve voor ontbrekende stukken. */
export function dictFromTranslation(lang: string, name: string, rtl: boolean, tr: Flat): Dict {
  const d = rebuild(en, "", tr) as Dict;
  return { ...d, code: lang, name, dir: rtl ? "rtl" : "ltr" };
}

export function loadCachedTranslation(lang: string): Flat | null {
  try {
    const raw = localStorage.getItem(KEY(lang));
    return raw ? (JSON.parse(raw) as Flat) : null;
  } catch {
    return null;
  }
}

/** Placeholders moeten in de vertaling blijven staan, anders gebruiken we de Engelse tekst. */
function placeholdersOk(src: string, out: string) {
  const a = (src.match(/\{\d\}/g) ?? []).sort().join();
  const b = (out.match(/\{\d\}/g) ?? []).sort().join();
  return a === b;
}

/**
 * Vertaalt de hele app naar `lang` op het toestel. Roep dit aan direct na een tik van de gebruiker
 * (de browser vraagt dat voor de eenmalige download van het taalmodel).
 */
export async function translateApp(lang: string, onProgress: (fraction: number) => void): Promise<Flat> {
  const T = api();
  if (!T) throw new Error("no-translator");
  const translator = await withTimeout(T.create({
    sourceLanguage: "en",
    targetLanguage: lang,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => onProgress(0.4 * ((e as ProgressEvent).loaded ?? 0)));
    },
  }), 180_000); // eenmalige download van het taalmodel mag even duren
  const flat: Flat = {};
  flatten(en, "", flat);
  const entries = Object.entries(flat);
  const out: Flat = {};
  let done = 0;
  // Een paar tegelijk vertalen; namen van organisaties (Het Juridisch Loket, DigiD…) blijven meestal staan.
  const queue = [...entries];
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [k, v] = item;
      try {
        const r = (await withTimeout(translator.translate(v), 15_000)).trim();
        out[k] = r && placeholdersOk(v, r) ? r : v;
      } catch {
        out[k] = v;
      }
      done++;
      if (done % 8 === 0) onProgress(0.4 + 0.6 * (done / entries.length));
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  translator.destroy?.();
  try {
    localStorage.setItem(KEY(lang), JSON.stringify(out));
  } catch {
    /* geen ruimte: dan volgende keer opnieuw */
  }
  onProgress(1);
  return out;
}
