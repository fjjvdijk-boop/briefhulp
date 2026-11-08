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
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
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

type Listener = (id: number | null) => void;
const listeners = new Set<Listener>();
let currentId: number | null = null;
let nextId = 1;
// Houd een verwijzing vast: anders ruimt Chrome de uitspraak op en komt "onend" nooit.
let keep: SpeechSynthesisUtterance | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

function setCurrent(id: number | null) {
  currentId = id;
  listeners.forEach((l) => l(id));
}

export function onSpeechChange(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function stopSpeech() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  keep = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setCurrent(null);
}

export interface SpeakOptions {
  /** App-taalcode, bijv. "nl", "ar", "uk". */
  lang: string;
  /** Snelheid: 1 = normaal. */
  rate?: number;
  onEnd?: () => void;
  /** De telefoon heeft geen stem voor deze taal. */
  onNoVoice?: () => void;
}

/**
 * Leest de stukken tekst vloeiend achter elkaar voor en geeft meteen een id terug.
 * Een nieuwe start stopt automatisch het vorige voorlezen.
 */
export function speak(parts: string[], opts: SpeakOptions): number {
  const id = nextId++;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return id;
  stopSpeech();
  setCurrent(id); // knop meteen op "Stoppen", ook terwijl de stemmen nog laden
  void run(id, parts, opts);
  return id;
}

async function run(id: number, parts: string[], opts: SpeakOptions) {
  const synth = window.speechSynthesis;
  const voices = await loadVoices();
  if (currentId !== id) return;
  const voice = pickVoice(voices, opts.lang);
  if (voices.length && !voice) {
    setCurrent(null); // geen stem voor deze taal op dit toestel
    opts.onNoVoice?.();
    return;
  }
  const bcp = voice?.lang ?? speechLang(opts.lang);
  const chunks = parts
    .map((p) => prepareForSpeech(p, opts.lang))
    .filter((p) => /[\p{L}\p{N}]/u.test(p))
    .flatMap((p) => chunkText(p, bcp));
  // Online (Natural) stemmen praten van zichzelf al rustig; eenvoudige stemmen iets langzamer.
  const rate = (opts.rate ?? 1) * (voice && GOOD.test(voice.name) ? 1 : 0.92);
  let i = 0;
  const next = () => {
    if (watchdog) clearTimeout(watchdog);
    if (currentId !== id) return;
    if (i >= chunks.length) {
      keep = null;
      setCurrent(null);
      opts.onEnd?.();
      return;
    }
    const text = chunks[i++];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcp;
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      next();
    };
    u.onend = done;
    u.onerror = (e) => {
      // "interrupted"/"canceled" = gestopt door de gebruiker of een nieuwe start
      if (e.error === "interrupted" || e.error === "canceled") return;
      done();
    };
    keep = u;
    // Vangnet: sommige browsers vergeten "onend". Ruim geschat: ± 12 tekens per seconde.
    const check = () => {
      if (finished || currentId !== id) return;
      if (!synth.speaking && !synth.pending) done();
      else watchdog = setTimeout(check, 1500);
    };
    watchdog = setTimeout(check, 2500 + (text.length / 12 / rate) * 1000);
    synth.speak(u);
    // Chrome: na cancel() blijft de motor soms op pauze staan
    if (synth.paused) synth.resume();
  };
  // Een klein moment na cancel(): anders slikt Safari/Chrome soms het eerste woord in
  setTimeout(next, 80);
}

export function isSpeaking(id: number | null) {
  return id !== null && currentId === id;
}
