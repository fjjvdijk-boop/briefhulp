import { isNative } from "./platform";

// Voorlezen met de ingebouwde stemmen van de telefoon (Web Speech API). Alles op het toestel.
//
// Waarom zo: browsers hebben bekende problemen die het voorlezen "haperig" maken.
// - Chrome stopt een lange zin na ± 15 seconden, en Android slaat soms zinnen over als je er veel tegelijk
//   in de wachtrij zet. Daarom lezen we ZIN VOOR ZIN (stukjes van max. ± 170 tekens) en starten we de
//   volgende pas als de vorige klaar is.
// - De lijst met stemmen is bij de eerste keer vaak nog leeg. We wachten even op "voiceschanged".
// - Elke telefoon heeft andere stemmen. We kiezen de mooiste stem voor de taal (Natural/Neural/Premium/
//   Enhanced/Google boven eenvoudige stemmen) en onthouden die keuze niet: nieuwe stemmen worden zo vanzelf gebruikt.
// - Bedragen, telefoonnummers, IBAN's en afkortingen schrijven we eerst om, zodat ze goed klinken.

/** Voorkeurs-taalcode per app-taal (de eerste is het best; andere varianten mogen ook). */
const PREFERRED: Record<string, string[]> = {
  nl: ["nl-NL", "nl-BE"],
  en: ["en-GB", "en-US", "en-IE", "en-AU"],
  ar: ["ar-SA", "ar-EG", "ar-AE", "ar-MA", "ar"],
  tr: ["tr-TR"],
  pl: ["pl-PL"],
  uk: ["uk-UA"],
  ru: ["ru-RU"],
  ro: ["ro-RO"],
  es: ["es-ES", "es-US", "es-MX"],
  fr: ["fr-FR", "fr-BE", "fr-CA"],
  fa: ["fa-IR", "fa-AF"],
  prs: ["fa-AF", "fa-IR"],
  so: ["so-SO"],
  pt: ["pt-PT", "pt-BR"],
  zh: ["zh-CN", "zh-TW", "zh-HK"],
  ckb: ["ckb-IQ", "ku"],
  kmr: ["ku-TR", "ku"],
  fil: ["fil-PH", "tl-PH"],
  yue: ["zh-HK", "yue-HK"],
};

/** De beste BCP 47-code om aan de stem te geven. */
export function speechLang(code: string) {
  return PREFERRED[code]?.[0] ?? code;
}

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

/** Wacht (max. 2 s) tot de telefoon zijn stemmen heeft geladen. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || isNative()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  if (!voicesReady) {
    voicesReady = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const done = () => {
        synth.removeEventListener?.("voiceschanged", done);
        resolve(synth.getVoices());
      };
      synth.addEventListener?.("voiceschanged", done);
      setTimeout(done, 2000);
    }).then((v) => {
      if (!v.length) voicesReady = null; // later opnieuw proberen
      return v;
    });
  }
  return voicesReady!;
}

const GOOD = /natural|neural|online|premium|enhanced|wavenet|siri|google/i;
const BAD = /compact|espeak|robot|novelty|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|zarvox|albert|fred|junior|ralph|bahh|wobble|superstar|good news/i;

/** Kiest de mooiste stem voor deze taal, of null als de telefoon die taal niet heeft. */
export function pickVoice(voices: SpeechSynthesisVoice[], code: string): SpeechSynthesisVoice | null {
  const prefs = PREFERRED[code] ?? [code];
  const base = prefs[0].split("-")[0].toLowerCase();
  const norm = (l: string) => l.replace("_", "-").toLowerCase();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const l = norm(v.lang);
    const idx = prefs.findIndex((p) => norm(p) === l);
    const sameBase = l.split("-")[0] === base || prefs.some((p) => l.split("-")[0] === norm(p).split("-")[0]);
    if (idx < 0 && !sameBase) continue;
    let score = idx >= 0 ? 50 - idx * 5 : 30;
    if (GOOD.test(v.name)) score += 25;
    if (BAD.test(v.name)) score -= 40;
    if (v.default) score += 3;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

/** Of deze telefoon een stem heeft voor deze taal (null = weet nog niet / geen lijst beschikbaar). */
export async function hasVoice(code: string): Promise<boolean | null> {
  if (isNative()) return null; // in de app meldt runNative dit zelf
  const v = await loadVoices();
  if (!v.length) return null;
  return !!pickVoice(v, code);
}

/* --------------------------------------------- Tekst omschrijven --------------------------------------------- */

const EURO: Record<string, [string, string]> = {
  // [euro, cent-voegwoord]
  nl: ["euro", ""],
  en: ["euros", "and"],
  ar: ["يورو", "و"],
  tr: ["avro", ""],
  pl: ["euro", ""],
  uk: ["євро", ""],
  ru: ["евро", ""],
  ro: ["euro", "și"],
  es: ["euros", "con"],
  fr: ["euros", ""],
  fa: ["یورو", "و"],
  so: ["yuuro", "iyo"],
  pt: ["euros", "e"],
};

/** Het woord voor de punt in een webadres. */
const DOT: Record<string, string> = {
  nl: "punt", en: "dot", ar: "نقطة", tr: "nokta", pl: "kropka", uk: "крапка", ru: "точка",
  ro: "punct", es: "punto", fr: "point", fa: "نقطه", so: "dhibic", pt: "ponto",
};

const NL_ABBR: [RegExp, string][] = [
  [/\bt\/m\b/gi, "tot en met"],
  [/\bbijv\./gi, "bijvoorbeeld"],
  [/\bbv\.(?=\s)/g, "bijvoorbeeld"],
  [/\bo\.a\./gi, "onder andere"],
  [/\bz\.s\.m\./gi, "zo snel mogelijk"],
  [/\bi\.v\.m\./gi, "in verband met"],
  [/\bm\.b\.t\./gi, "met betrekking tot"],
  [/\ba\.u\.b\./gi, "alstublieft"],
  [/\bd\.d\./gi, "van"],
  [/\bevt\./gi, "eventueel"],
  [/\bca\./gi, "ongeveer"],
  [/\bincl\./gi, "inclusief"],
  [/\bexcl\./gi, "exclusief"],
  [/\bnr\./gi, "nummer"],
  [/\bjl\./gi, "jongstleden"],
  [/\bdhr\./gi, "de heer"],
  [/\bmevr\./gi, "mevrouw"],
  [/\bB\.V\.?/g, "B V"],
  [/\bN\.V\.?/g, "N V"],
  [/\bBSN\b/g, "B S N"],
  [/\bCJIB\b/g, "C J I B"],
  [/\bUWV\b/g, "U W V"],
  [/\bSVB\b/g, "S V B"],
  [/\bDUO\b/g, "D U O"],
  [/\bWOZ\b/g, "woz"],
  [/\bAVG\b/g, "A V G"],
  [/\bIBAN\b/g, "iban"],
  [/\bKvK\b/g, "K v K"],
];

/** Getal met Nederlandse of Engelse notatie → [hele euro's, centen]. */
function splitAmount(raw: string): [string, string] | null {
  const m = raw.replace(/\s/g, "");
  let int: string, dec = "";
  if (/,\d{1,2}$/.test(m)) [int, dec] = [m.replace(/,\d{1,2}$/, ""), m.match(/,(\d{1,2})$/)![1]];
  else if (/\.\d{2}$/.test(m)) [int, dec] = [m.replace(/\.\d{2}$/, ""), m.match(/\.(\d{2})$/)![1]];
  else int = m;
  int = int.replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(int)) return null;
  if (dec === "-" || /^0+$/.test(dec)) dec = "";
  return [int, dec.length === 1 ? dec + "0" : dec];
}

/** Schrijft tekst om zodat hij vloeiend en goed verstaanbaar wordt voorgelezen. */
export function prepareForSpeech(text: string, code: string): string {
  const lang = code.split("-")[0];
  let s = text;
  // Onzichtbare richtingstekens (Arabisch/Farsi) en harde spaties
  s = s.replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, "").replace(/[\u00a0\u202f]/g, " ");
  // Arabische en Perzische cijfers → gewone cijfers (zodat bedragen en nummers goed herkend worden)
  s = s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/(\d)٫(\d)/g, "$1,$2")
    .replace(/(\d)٬(\d)/g, "$1.$2");
  // Tekens die niet uitgesproken moeten worden
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ");
  s = s.replace(/[•▪◦●►▶→⇒✓✔✗✘★☆|_*#~^<>{}[\]]/g, " ");
  s = s.replace(/-{2,}|—|–/g, ", ");
  // Bedragen: "€ 1.250,00" / "1.250,00 euro" / "EUR 12,50"
  const [euro, and] = EURO[lang] ?? ["euro", ""];
  const say = (raw: string) => {
    const a = splitAmount(raw);
    if (!a) return raw;
    const [int, dec] = a;
    return dec ? `${int} ${euro}${and ? ` ${and}` : ""} ${dec}` : `${int} ${euro}`;
  };
  s = s.replace(/(?:€|\bEUR)\s?(\d[\d.,\s]*\d|\d)(?:,-)?/g, (_, n) => say(n));
  s = s.replace(/(\d[\d.,]*[.,]\d{2})\s?(?:€|euro\b|EUR\b)/gi, (_, n) => say(n));
  s = s.replace(/(\d[\d.,]*)\s?€/g, (_, n) => say(n));
  // IBAN: alles los gespeld, per groepje een korte pauze (makkelijk mee te schrijven)
  const spell = (g: string) => g.split("").join(" ");
  s = s.replace(/\b([A-Z]{2}\d{2})\s?([A-Z]{4})\s?((?:\d{2,4}\s?){2,5})/g, (_, cc: string, bank: string, rest: string) =>
    [spell(cc), spell(bank), ...rest.trim().split(/\s+/).map(spell)].join(", ") + ", ",
  );
  // Telefoonnummers cijfer voor cijfer, in groepjes ("0800 - 8020" → "0 8 0 0, 8 0 2 0")
  s = s.replace(/(?<![\d.,])(?:\+31\s?|0)(?:\d[\s-]{0,3}){7,11}(?!\d|[.,]\d)/g, (m) => {
    const digits = m.replace(/\D/g, "");
    const phone = /^(?:31\d{9}|0[1-9]\d{8}|0[89]00\d{4,7})$/.test(digits) && !/^\d{1,2}-\d{1,2}-\d{2,4}\s*$/.test(m);
    if (!phone) return m;
    const end = /\s$/.test(m) ? " " : "";
    return m.trim().split(/[\s-]+/).filter(Boolean).map(spell).join(", ") + end;
  });
  // Webadressen: "https://www.cjib.nl/betalen" → "cjib punt nl, schuine streep betalen" (zonder rare knip bij de punt)
  const dot = DOT[lang] ?? "dot";
  s = s.replace(/\b(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+(?:nl|com|eu|org|net|be|de|me|info))(\/[^\s,)]*)?/gi, (_, host: string, path?: string) => {
    const h = host.toLowerCase().split(".").join(` ${dot} `);
    const p = path && path !== "/" ? " " + path.replace(/^\//, "").replace(/\/$/, "").split(/[/-]/).join(" ") : "";
    return h + p;
  });
  // Nederlandse afkortingen (de brief zelf is altijd Nederlands; ook in andere talen staan er soms Nederlandse woorden)
  if (lang === "nl") for (const [re, w] of NL_ABBR) s = s.replace(re, w);
  else s = s.replace(/\bt\/m\b/gi, "–").replace(/\bB\.V\.?/g, "B V");
  // Schuine streep tussen woorden → "of"-pauze; haakjes → komma-pauze
  s = s.replace(/(\p{L})\/(\p{L})/gu, "$1, $2");
  // Haakjes: kort stukje ("(alles)") gewoon meelezen; langer stuk met korte pauzes
  s = s.replace(/\(([^()]{1,25})\)/g, " $1 ");
  s = s.replace(/\s*[()]\s*/g, ", ");
  // Spaties en dubbele leestekens netjes
  s = s.replace(/\s+([,.;:!?،؟])/g, "$1").replace(/([,;:،])(?:\s*[,;:،])+/g, "$1");
  s = s.replace(/[,;:،]\s*([.!?؟])/g, "$1").replace(/[,;:،]\s*$/, "");
  s = s.replace(/^[\s,;:]+/, "").replace(/\s{2,}/g, " ");
  return s.trim();
}

/**
 * Tekst van een gescande brief → stukken voor het voorlezen. Afgebroken woorden aan het einde van een regel
 * worden weer heel; korte regels zonder punt (adres, kopjes) krijgen een korte pauze.
 */
export function letterToSpeech(text: string): string[] {
  const pages = text.split(/---\s*volgende bladzijde\s*---/i);
  const out: string[] = [];
  for (const page of pages) {
    const lines = page.split("\n").map((l) => l.trim());
    let para = "";
    const flush = () => {
      if (para.trim()) out.push(para.trim());
      para = "";
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        flush();
        continue;
      }
      if (/\p{L}-$/u.test(line) && lines[i + 1] && /^\p{Ll}/u.test(lines[i + 1])) {
        para += line.slice(0, -1); // "beta-" + "ling"
        continue;
      }
      const next = lines[i + 1] ?? "";
      const ends = /[.!?:;,]$/.test(line);
      const continues = !!next && /^\p{Ll}/u.test(next) && line.length > 35;
      para += line + (ends || continues ? " " : ". ");
    }
    flush();
  }
  return out;
}

/** Deelt tekst op in zinnen en voegt korte zinnen samen tot stukken van max. `max` tekens. */
export function chunkText(text: string, code: string, max = 170): string[] {
  let sentences: string[];
  try {
    const seg = new Intl.Segmenter(code, { granularity: "sentence" });
    sentences = [...seg.segment(text)].map((x) => x.segment.trim()).filter(Boolean);
  } catch {
    sentences = text.match(/[^.!?؟。]+[.!?؟。]*\s*/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
  }
  const pieces: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) {
      pieces.push(s);
      continue;
    }
    // Lange zin: knippen bij een komma, anders bij een spatie
    let rest = s;
    while (rest.length > max) {
      let cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf("; ", max), rest.lastIndexOf("، ", max));
      if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
      if (cut < max * 0.4) cut = max;
      pieces.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) pieces.push(rest);
  }
  // Korte zinnen samenvoegen geeft een natuurlijker ritme (minder losse pauzes)
  const out: string[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last && last.length + p.length + 1 <= max && last.length < 60) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out;
}

/* --------------------------------------------- Afspelen --------------------------------------------- */
//
// Eén speler voor de hele app. De tekst wordt in stukjes (zinnen) verdeeld en stukje voor stukje voorgelezen.
// Zo kunnen we betrouwbaar pauzeren en verder gaan (de pauzeknop van browsers werkt op Android niet goed),
// het tempo aanpassen zonder opnieuw te beginnen, en laten zien waar we zijn ("zin 3 van 12").

export interface SpeechState {
  /** Id van wat er nu voorgelezen wordt (null = niets). */
  id: number | null;
  /** Stukje dat nu (of na "verder") wordt voorgelezen, vanaf 0. */
  index: number;
  total: number;
  paused: boolean;
  /** Tempo: 1 = normaal. */
  rate: number;
  /** Korte naam van wat er voorgelezen wordt (voor de spelerbalk). */
  label: string;
  /** De tekst van het stukje dat nu wordt voorgelezen. */
  current: string;
  /** Taal van wat er voorgelezen wordt (voor lang= op de spelerbalk). */
  lang: string;
  /** De telefoon had geen (werkende) stem voor deze taal: melding tonen. */
  noVoice: boolean;
}

export interface SpeakOptions {
  /** App-taalcode, bijv. "nl", "ar", "uk". */
  lang: string;
  /** Snelheid: 1 = normaal. Weggelaten: het laatst gekozen tempo. */
  rate?: number;
  /** Naam voor de spelerbalk, bijv. "Wat moet u doen?". */
  label?: string;
  onEnd?: () => void;
  /** De telefoon heeft geen (werkende) stem voor deze taal. */
  onNoVoice?: () => void;
}

type Listener = (id: number | null) => void;
type StateListener = (s: SpeechState) => void;
const listeners = new Set<Listener>();
const stateListeners = new Set<StateListener>();

const SLOW = 0.78;
const RATE_KEY = "briefhulp:speech-rate";
function savedRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return v > 0.4 && v < 2 ? v : 1;
  } catch {
    return 1;
  }
}

let state: SpeechState = { id: null, index: 0, total: 0, paused: false, rate: 1, label: "", current: "", lang: "nl", noVoice: false };
let rateLoaded = false;
let chunks: string[] = [];
let opts: SpeakOptions = { lang: "nl" };
let nextId = 1;
/** Elke start, pauze of stop krijgt een nieuw nummer: een oude afspeelronde ziet dan dat hij moet stoppen. */
let token = 0;
// Houd een verwijzing vast: anders ruimt Chrome de uitspraak op en komt "onend" nooit.
let keep: SpeechSynthesisUtterance | null = null;
let unlocked = false;

function emit(patch: Partial<SpeechState>) {
  const prevId = state.id;
  state = { ...state, ...patch };
  stateListeners.forEach((l) => l(state));
  if (patch.id !== undefined && patch.id !== prevId) listeners.forEach((l) => l(state.id));
}

/** Volgt alleen wélk voorlezen er loopt (id). */
export function onSpeechChange(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Volgt alles: voortgang, pauze, tempo (voor de spelerbalk). */
export function onSpeechState(l: StateListener) {
  stateListeners.add(l);
  l(getSpeechState());
  return () => {
    stateListeners.delete(l);
  };
}

export function getSpeechState(): SpeechState {
  if (!rateLoaded && typeof window !== "undefined") {
    rateLoaded = true;
    state = { ...state, rate: savedRate() };
  }
  return state;
}

export function isSpeaking(id: number | null) {
  return id !== null && state.id === id;
}

/** Kan dit toestel voorlezen? (In de app altijd: de stem van de telefoon zelf.) */
export function speechSupported() {
  if (typeof window === "undefined") return false;
  return isNative() || "speechSynthesis" in window;
}

// Let op: een Capacitor-plug-in nooit los uit een promise teruggeven (hij lijkt dan zelf een promise en
// de app roept "then" aan op de plug-in). Daarom verpakt in een object.
const nativeTts = () => import("@capacitor-community/text-to-speech").then((m) => ({ tts: m.TextToSpeech }));

function cancelEngine() {
  keep = null;
  if (isNative()) void nativeTts().then(({ tts }) => tts.stop()).catch(() => {});
  else if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/**
 * iPhone/iPad (Safari) en sommige Android-browsers laten de stem pas praten als dat direct bij een tik begint.
 * Wij wachten eerst op de stemmen; daarom zeggen we bij de allereerste tik meteen een stille spatie.
 */
function unlockWebSpeech() {
  if (unlocked || isNative() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    unlocked = true;
  } catch {
    /* niet erg */
  }
}

/**
 * Leest de stukken tekst vloeiend achter elkaar voor en geeft meteen een id terug.
 * Een nieuwe start stopt automatisch het vorige voorlezen. Roep dit aan vanuit een tik (knop).
 */
export function speak(parts: string[], o: SpeakOptions): number {
  const id = nextId++;
  if (!speechSupported()) return id;
  token++;
  cancelEngine();
  unlockWebSpeech();
  getSpeechState();
  const rate = o.rate ?? state.rate;
  opts = o;
  chunks = [];
  emit({ id, index: 0, total: 0, paused: false, rate, label: o.label ?? "", current: "", lang: o.lang, noVoice: false });
  void prepareAndPlay(id, parts, token);
  return id;
}

export function stopSpeech() {
  token++;
  cancelEngine();
  if (state.id !== null || state.paused) emit({ id: null, paused: false, index: 0, total: 0, current: "" });
}

/** Pauzeren: we onthouden de zin en beginnen bij "verder" opnieuw met die zin. */
export function pauseSpeech() {
  if (state.id === null || state.paused) return;
  token++;
  cancelEngine();
  emit({ paused: true });
}

export function resumeSpeech() {
  if (state.id === null || !state.paused) return;
  unlockWebSpeech();
  emit({ paused: false });
  void playFrom(state.id, state.index, ++token);
}

/** Tempo kiezen (1 = normaal). Wordt onthouden; tijdens het voorlezen gaat de huidige zin opnieuw in het nieuwe tempo. */
export function setSpeechRate(rate: number) {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* geen opslag */
  }
  emit({ rate });
  if (state.id !== null && !state.paused) {
    token++;
    cancelEngine();
    void playFrom(state.id, state.index, token);
  }
}

export function toggleSlow() {
  setSpeechRate(getSpeechState().rate < 0.95 ? 1 : SLOW);
}

/** Naar de vorige of volgende zin springen. */
export function skipSpeech(delta: number) {
  if (state.id === null || !chunks.length) return;
  const index = Math.max(0, Math.min(chunks.length - 1, state.index + delta));
  emit({ index, current: chunks[index] });
  if (!state.paused) {
    token++;
    cancelEngine();
    void playFrom(state.id, index, token);
  }
}

// Scherm uit of naar een andere app (browser): pauzeren, zodat de knop niet blijft hangen op "Stoppen"
// en u daarna gewoon verder kunt luisteren.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !isNative() && state.id !== null && !state.paused) pauseSpeech();
  });
}

/* ---------- Voorbereiden: stem kiezen en tekst in stukjes ---------- */

let webVoice: SpeechSynthesisVoice | null = null;
let webLang = "";
let nativeLang = "";

async function prepareAndPlay(id: number, parts: string[], t: number) {
  let bcp: string;
  if (isNative()) {
    const lang = await nativeLanguage(opts.lang);
    if (t !== token) return;
    if (!lang) return noVoice(t);
    nativeLang = bcp = lang;
  } else {
    const voices = await loadVoices();
    if (t !== token) return;
    const voice = pickVoice(voices, opts.lang);
    if (voices.length && !voice) return noVoice(t);
    webVoice = voice;
    webLang = bcp = voice?.lang ?? speechLang(opts.lang);
  }
  chunks = parts
    .map((p) => prepareForSpeech(p, opts.lang))
    .filter((p) => /[\p{L}\p{N}]/u.test(p))
    .flatMap((p) => chunkText(p, bcp));
  if (!chunks.length) return finish(t);
  emit({ total: chunks.length, current: chunks[0] });
  // Een klein moment na cancel(): anders slikt Safari/Chrome soms het eerste woord in
  if (!isNative()) await new Promise((r) => setTimeout(r, 80));
  if (t !== token) return;
  await playFrom(id, 0, t);
}

function noVoice(t: number) {
  if (t !== token) return;
  const cb = opts.onNoVoice;
  emit({ id: null, paused: false, total: 0, current: "", noVoice: true });
  cb?.();
}

/** De melding "geen stem" wegklikken. */
export function dismissNoVoice() {
  emit({ noVoice: false });
}

function finish(t: number) {
  if (t !== token) return;
  keep = null;
  const cb = opts.onEnd;
  emit({ id: null, paused: false, index: 0, total: 0, current: "" });
  cb?.();
}

/** Taal voor de plug-in in de app. De spraakdienst van Android start soms traag op: dan nog even opnieuw proberen. */
async function nativeLanguage(code: string): Promise<string | null> {
  const { tts } = await nativeTts();
  const candidates = [...new Set([speechLang(code), ...(PREFERRED[code] ?? []), code])];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const c of candidates) {
      try {
        if ((await tts.isLanguageSupported({ lang: c })).supported) return c;
      } catch {
        /* dienst nog niet klaar: volgende poging */
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/* ---------- Afspelen vanaf een bepaalde zin ---------- */

async function playFrom(id: number, from: number, t: number) {
  let spokeSomething = false;
  let failures = 0;
  for (let i = from; i < chunks.length; i++) {
    if (t !== token) return;
    emit({ index: i, current: chunks[i] });
    const result = isNative() ? await sayNative(chunks[i], t) : await sayWeb(chunks[i], t);
    if (t !== token || result === "stopped") return;
    if (result === "ok") {
      spokeSomething = true;
      failures = 0;
      continue;
    }
    // Mislukt. Op het web: probeer een stem die op het toestel zelf staat (online stemmen werken niet zonder internet).
    if (!isNative() && result === "error" && webVoice && !webVoice.localService) {
      const local = pickVoice((await loadVoices()).filter((v) => v.localService), opts.lang);
      if (t !== token) return;
      webVoice = local;
      if (local) webLang = local.lang;
      i--; // dezelfde zin opnieuw
      continue;
    }
    // Safari zonder tik: wachten op de gebruiker (pauze tonen), in plaats van stil te blijven hangen
    if (result === "blocked") {
      unlocked = false;
      emit({ paused: true, index: i });
      return;
    }
    if (++failures >= 2 && !spokeSomething) return noVoice(t);
  }
  finish(t);
  void id;
}

type SayResult = "ok" | "error" | "blocked" | "stopped";

function sayWeb(text: string, t: number): Promise<SayResult> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = webLang;
    if (webVoice) u.voice = webVoice;
    // Online (Natural) stemmen praten van zichzelf al rustig; eenvoudige stemmen iets langzamer.
    u.rate = state.rate * (webVoice && GOOD.test(webVoice.name) ? 1 : 0.92);
    u.pitch = 1;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const end = (r: SayResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(t !== token ? "stopped" : r);
    };
    u.onend = () => end("ok");
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") end("stopped");
      else if (e.error === "not-allowed") end("blocked");
      else end("error");
    };
    keep = u;
    // Vangnet: sommige browsers vergeten "onend". Ruim geschat: ± 12 tekens per seconde.
    let started = false;
    u.onstart = () => (started = true);
    const check = () => {
      if (settled) return;
      if (t !== token) return end("stopped");
      if (!synth.speaking && !synth.pending) return end(started ? "ok" : "error");
      timer = setTimeout(check, 1500);
    };
    timer = setTimeout(check, 2500 + (text.length / 12 / u.rate) * 1000);
    synth.speak(u);
    // Chrome: na cancel() blijft de motor soms op pauze staan
    if (synth.paused) synth.resume();
  });
}

async function sayNative(text: string, t: number): Promise<SayResult> {
  try {
    const { tts } = await nativeTts();
    if (t !== token) return "stopped";
    // De plug-in wacht tot de zin uitgesproken is: zo komen de zinnen netjes na elkaar
    await tts.speak({ text, lang: nativeLang, rate: state.rate, pitch: 1, volume: 1, category: "playback" });
    return t !== token ? "stopped" : "ok";
  } catch {
    return t !== token ? "stopped" : "error";
  }
}
