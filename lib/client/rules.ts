// Gratis uitleg zonder AI: vaste regels die belangrijke dingen uit de brieftekst halen.
// Minder slim dan de AI-uitleg, maar het kost niets en werkt helemaal op de telefoon.
import type { Analysis, SenderType, Urgency } from "../types";
import type { Dict } from "../i18n/nl";

// ---------- Hulpjes ----------
const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, maart: 3, mrt: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, augustus: 8, aug: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const NUMBER_WORDS: Record<string, number> = {
  een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  elf: 11, twaalf: 12, veertien: 14, eenentwintig: 21, achtentwintig: 28, dertig: 30,
};

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
function validDate(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y >= 2000 && y <= 2100;
}
function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}
function diffDays(a: string, b: string) {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  return Math.round((new Date(pb[0], pb[1] - 1, pb[2]).getTime() - new Date(pa[0], pa[1] - 1, pa[2]).getTime()) / 86_400_000);
}
export function fmtDate(iso: string, loc = "nl-NL") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" });
}
export function formatEuro(n: number, loc = "nl-NL") {
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  } catch {
    return "€ " + n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function sentences(text: string) {
  return text
    .replace(/\s*\n\s*/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ÀÉÈËÏÖÜ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 400);
}

// ---------- Datums ----------
interface DateHit {
  iso: string;
  index: number;
  before: string; // tekst vlak voor de datum
}

function findDates(text: string): DateHit[] {
  const hits: DateHit[] = [];
  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  const long = new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\.?\\s+(\\d{4})\\b`, "gi");
  for (const m of text.matchAll(long)) {
    const d = +m[1], mo = MONTHS[m[2].toLowerCase()], y = +m[3];
    if (validDate(y, mo, d)) hits.push({ iso: toIso(y, mo, d), index: m.index!, before: text.slice(Math.max(0, m.index! - 120), m.index!) });
  }
  const num = /\b(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})\b/g;
  for (const m of text.matchAll(num)) {
    const d = +m[1], mo = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    if (validDate(y, mo, d)) hits.push({ iso: toIso(y, mo, d), index: m.index!, before: text.slice(Math.max(0, m.index! - 120), m.index!) });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function findLetterDate(dates: DateHit[], today: string) {
  const labeled = dates.find((d) => /(datum|dagtekening|verzonden|verzenddatum)\s*:?\s*[^\n]{0,15}$/i.test(d.before));
  if (labeled) return labeled.iso;
  // anders: de eerste datum die niet in de toekomst ligt
  return dates.find((d) => diffDays(d.iso, today) >= 0 && diffDays(d.iso, today) < 120)?.iso ?? null;
}

const DEADLINE_WORDS =
  /(uiterlijk|vóór|voor|vervaldatum|uiterste|betaaldatum|te voldoen|ontvangen|tot en met|t\/m|niet later dan|betalen op|afgeschreven op|verschijnen|zitting|reageren)\s*(de|op|het)?\s*:?\s*[^\n.]{0,25}$/i;

function findDeadline(text: string, dates: DateHit[], letterDate: string | null, today: string) {
  const from = letterDate ?? today;
  const candidates = dates.filter(
    (d) =>
      (DEADLINE_WORDS.test(d.before) || /(verschijnen|zitting|kantonrechter)[^.]*$/i.test(d.before)) &&
      d.iso !== letterDate &&
      diffDays(from, d.iso) >= 0 &&
      diffDays(from, d.iso) < 400,
  );
  const strong = candidates.find((d) => /(uiterlijk|vervaldatum|uiterste|niet later dan)/i.test(d.before));
  const pick = strong ?? candidates[0];
  if (pick) return { date: pick.iso, is_estimate: false };

  // "binnen 14 dagen" (niet bij bezwaar: dat is een andere termijn)
  const rel = /binnen\s+(\d{1,3}|[a-zé]+)\s+(werk)?(dagen|dag|weken|week)/gi;
  for (const m of text.matchAll(rel)) {
    const ctx = text.slice(Math.max(0, m.index! - 120), m.index! + 80);
    if (/bezwaar|beroep/i.test(ctx)) continue;
    const n = /^\d+$/.test(m[1]) ? +m[1] : NUMBER_WORDS[m[1].toLowerCase()];
    if (!n) continue;
    let days = /week/i.test(m[3]) ? n * 7 : n;
    if (m[2]) days = Math.ceil(days * 1.4); // werkdagen
    return { date: addDays(from, days), is_estimate: true };
  }
  return null;
}

// ---------- Bedragen ----------
interface AmountHit {
  value: number;
  label: string;
  index: number;
}
function parseEuro(raw: string) {
  const s = raw.replace(/\s/g, "");
  if (/,\d{2}$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (/\.\d{2}$/.test(s) && !/,/.test(s)) return parseFloat(s.replace(/,/g, ""));
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}
function findAmounts(text: string): AmountHit[] {
  const out: AmountHit[] = [];
  const re = /(?:€|EUR|eur)\s?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2}|,-)?|\d+(?:,\d{1,2})?)|(\d{1,3}(?:\.\d{3})*,\d{2})\s?(?:euro|EUR)\b/g;
  for (const m of text.matchAll(re)) {
    const raw = (m[1] ?? m[2]).replace(",-", ",00");
    const value = parseEuro(raw);
    if (!isFinite(value) || value <= 0 || value > 1_000_000) continue;
    const lineStart = text.lastIndexOf("\n", m.index!) + 1;
    let label = text
      .slice(lineStart, m.index!)
      .replace(/[:.\-–]+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (label.length > 60) label = "…" + label.slice(-57);
    out.push({ value, label: label || "Bedrag", index: m.index! });
  }
  return out;
}
const TOTAL_WORDS = /(totaal|te betalen|openstaand|verschuldigd|nog te betalen|totaalbedrag|terug te betalen|vordering|saldo)/i;

// ---------- Rekeningnummer, kenmerken, contact ----------
function ibanValid(iban: string) {
  const s = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("NL") && s.length !== 18) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}
// Typische leesfouten herstellen: letters op een cijferplek en andersom (NL: 2 letters, 2 cijfers, 4 letters, 10 cijfers).
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6", T: "7" };
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "6": "G" };
function fixIbanOcr(s: string) {
  const chars = s.split("");
  const isNl = s.startsWith("NL");
  return chars
    .map((ch, i) => {
      if (i < 2) return ch;
      const digitPlace = i < 4 || (isNl && i >= 8);
      const letterPlace = isNl && i >= 4 && i < 8;
      if (digitPlace) return TO_DIGIT[ch] ?? ch;
      if (letterPlace) return TO_LETTER[ch] ?? ch;
      return ch;
    })
    .join("");
}

function findIban(text: string) {
  const re = /\b([A-Z]{2}\s{0,3}[0-9OIL]{2}(?:\s{0,3}[A-Z0-9]){10,30})/g;
  const upper = text.toUpperCase().replace(/O(?=\d)/g, "0");
  for (const m of upper.matchAll(re)) {
    // probeer steeds kortere stukken (er kan tekst achter staan)
    const compact = m[1].replace(/\s/g, "");
    for (let len = Math.min(compact.length, 34); len >= 15; len--) {
      const cand = compact.slice(0, len);
      for (const c of [cand, fixIbanOcr(cand)]) {
        if (ibanValid(c)) return c.replace(/(.{4})/g, "$1 ").trim();
      }
    }
  }
  return null;
}

const REF_LABELS = [
  "betalingskenmerk", "betaalkenmerk", "aanslagnummer", "beschikkingsnummer", "dossiernummer", "zaaknummer",
  "klantnummer", "relatienummer", "debiteurnummer", "factuurnummer", "polisnummer", "contractnummer",
  "cjib-nummer", "cjibnummer", "ons kenmerk", "uw kenmerk", "kenmerk", "referentie", "burgerservicenummer", "bsn",
];
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function findReferences(text: string) {
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const label of REF_LABELS) {
    const re = new RegExp(`\\b${label.replace("-", "[- ]?")}\\b\\s*(?:nr\\.?|nummer)?\\s*[:.]?\\s*([A-Z0-9][A-Z0-9 .\\-/]{3,40})`, "gi");
    for (const m of text.matchAll(re)) {
      let value = m[1].split(/\s{2,}|\n/)[0].trim();
      value = value.replace(/\s+[A-Za-z]{3,}.*$/, "").replace(/[.\-/\s]+$/, ""); // stop bij een woord
      if (!/\d{3}/.test(value)) continue;
      const lbl = label === "bsn" || label === "burgerservicenummer" ? "BSN" : capitalize(label);
      if (lbl === "BSN") value = `*****${value.replace(/\D/g, "").slice(-3)}`;
      const key = value.replace(/\W/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: lbl, value });
      break;
    }
  }
  return out.slice(0, 6);
}

// Een betalingskenmerk is meestal 16 cijfers (soms 7 of 15), vaak verdeeld over twee regels.
function findPaymentReference(text: string) {
  const m = text.match(/(?:betalings?kenmerk|betaalkenmerk)\s*(?:nummer)?\s*[:.]?\s*((?:\d[\s.]{0,3}){7,16})/i);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.length >= 15 ? digits.replace(/(\d{4})(?=\d)/g, "$1 ") : digits;
}

function findPhone(text: string) {
  const re = /(?:\+31\s?\(?0?\)?|\b0)(?:[\s-]?\d){6,10}\b/g;
  const cands: { phone: string; score: number }[] = [];
  for (const m of text.matchAll(re)) {
    const digits = m[0].replace(/\D/g, "").replace(/^31/, "0");
    const special = /^0(800|900|88)/.test(digits);
    if (!(digits.length === 10 || (special && digits.length >= 7 && digits.length <= 11))) continue;
    const before = text.slice(Math.max(0, m.index! - 40), m.index!);
    const score = /(tel|bel|telefoon|telefonisch|bereikbaar)/i.test(before) ? 2 : /fax/i.test(before) ? -5 : 0;
    cands.push({ phone: m[0].trim(), score });
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0]?.phone ?? null;
}
function findEmail(text: string) {
  return text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i)?.[0] ?? null;
}
function findWebsite(text: string) {
  const re = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:nl|com|eu|org|net|info)(?:\/[^\s),]*)?/gi;
  for (const m of text.matchAll(re)) {
    const before = text[m.index! - 1];
    if (before === "@") continue;
    const w = m[0].replace(/[.,;:]$/, "");
    if (/@/.test(w)) continue;
    return w.replace(/^https?:\/\//, "");
  }
  return null;
}

// ---------- Afzender en soort brief ----------
const SENDERS: { re: RegExp; type: SenderType; name?: string }[] = [
  { re: /gerechtsdeurwaarder|deurwaarderskantoor|\bdeurwaarder/i, type: "deurwaarder" },
  { re: /\bCJIB\b|Centraal Justitieel Incassobureau/i, type: "cjib", name: "CJIB (Centraal Justitieel Incassobureau)" },
  { re: /\bdagvaarding\b|\brechtbank\b|kantonrechter/i, type: "rechtbank" },
  { re: /Dienst Toeslagen|Belastingdienst\s*\/?\s*Toeslagen/i, type: "toeslagen", name: "Dienst Toeslagen" },
  { re: /Belastingdienst/i, type: "belastingdienst", name: "Belastingdienst" },
  { re: /incassobureau|incasso\s?(?:b\.?v\.?|diensten)|gerechtelijke incasso|buitengerechtelijke/i, type: "incassobureau" },
  { re: /\bUWV\b/, type: "uwv", name: "UWV" },
  { re: /\bSVB\b|Sociale Verzekeringsbank/i, type: "svb", name: "SVB (Sociale Verzekeringsbank)" },
  { re: /\bDUO\b|Dienst Uitvoering Onderwijs/i, type: "duo", name: "DUO" },
  { re: /\bCAK\b/, type: "zorg", name: "CAK" },
  {
    re: /zorgverzeker|Zilveren Kruis|\bCZ\b|\bVGZ\b|Menzis|\bDSW\b|\bONVZ\b|Zorg en Zekerheid|Interpolis|\bFBTO\b|Univ[ée]|Salland|Stad Holland|De Friesland|Ditzo|Anderzorg|InTwente|\bOHRA\b|Promovendum|ZieZo|ziektekosten/i,
    type: "zorgverzekeraar",
  },
  { re: /Vattenfall|Eneco|Essent|Greenchoice|Budget Energie|Engie|Vandebron|Oxxio|Energiedirect|Pure Energie|Frank Energie|waterbedrijf|Vitens|Evides|Brabant Water|Dunea|\bPWN\b|Waternet/i, type: "energie" },
  { re: /woningcorporatie|woonstichting|wooncorporatie|woningstichting|huurachterstand|Ymere|Eigen Haard|Woonbron|Havensteder|Portaal|Mitros|Stadgenoot|de Alliantie|Vestia|Rochdale/i, type: "woning" },
  { re: /waterschap|hoogheemraadschap|\bBSGW\b|\bGBLT\b|\bSVHW\b|Belastingsamenwerking|gemeentelijke belastingen|\bgemeente\b/i, type: "gemeente" },
  { re: /ziekenhuis|huisarts|tandarts|apotheek|fysiotherap|GGD/i, type: "zorg" },
  { re: /\bING\b|Rabobank|ABN AMRO|\bSNS\b|ASN Bank|Triodos|\bbunq\b|Knab|RegioBank/i, type: "bank" },
  { re: /verzekering|polis|schadeclaim/i, type: "verzekeraar" },
  { re: /werkgever|salaris|loonstrook|arbeidsovereenkomst/i, type: "werk" },
  { re: /\bschool\b|leerplicht|basisschool|ROC|hogeschool|universiteit/i, type: "school" },
];

const THREAT_ONLY: SenderType[] = ["deurwaarder", "rechtbank"];

function findSender(text: string): { name: string; type: SenderType } {
  // 1. Briefhoofd (bovenkant) en ondertekening (onderkant): daar staat de echte afzender.
  const lines = text.split("\n").filter((l) => l.trim());
  const head = lines.slice(0, 6).join("\n");
  const tail = lines.slice(-4).join("\n");
  for (const part of [head, tail]) {
    const hit = matchSender(part, false);
    if (hit) return withPrincipal(hit, text);
  }
  // 2. De hele brief, maar dreigementen ("we schakelen een deurwaarder in") tellen niet als afzender.
  const hit = matchSender(text, true);
  if (hit) return withPrincipal(hit, text);
  // 3. Anders: eerste regel bovenaan die op een naam lijkt
  const first = lines
    .map((l) => l.trim())
    .find((l) => l.length >= 3 && l.length <= 45 && /[A-Za-z]{3}/.test(l) && !/\d{3}/.test(l));
  return { name: first ? cleanName(first) : "", type: "overig" };
}

function cleanName(s: string) {
  return capitalize(s.replace(/[:|]+/g, "").replace(/[\s.,;]+$/, "").trim());
}

// "Namens onze opdrachtgever X" → "Incassobureau Y (namens X)"
function withPrincipal(s: { name: string; type: SenderType }, text: string) {
  if (s.type !== "incassobureau" && s.type !== "deurwaarder") return s;
  const m = text.match(/(?:namens|in opdracht van|opdrachtgever)\s+(?:onze\s+|uw\s+)?(?:opdrachtgever\s+|cliënt(?:e)?\s+)?:?\s*([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,4})/);
  if (m && !s.name.includes(m[1])) return { ...s, name: `${s.name} (namens ${m[1].replace(/[.,]+$/, "")})` };
  return s;
}

function matchSender(text: string, skipThreats: boolean): { name: string; type: SenderType } | null {
  for (const s of SENDERS) {
    if (skipThreats && THREAT_ONLY.includes(s.type)) continue;
    const m = text.match(s.re);
    if (!m) continue;
    if (s.name) return { name: s.name, type: s.type };
    if (s.type === "gemeente") {
      const g = text.match(/\b(Gemeente|Waterschap|Hoogheemraadschap)\s+([A-Z][\wÀ-ÿ'-]+(?:[\s-][A-Z][\wÀ-ÿ'-]+)?)/);
      if (g) return { name: `${g[1]} ${g[2]}`, type: "gemeente" };
    }
    // naam: de regel waarin de afzender staat (kort gehouden)
    const line = text.split("\n").find((l) => s.re.test(l))?.trim() ?? m[0];
    const name = line.length <= 50 ? line : m[0];
    return { name: cleanName(name), type: s.type };
  }
  return null;
}

type TypeKey = keyof Dict["r"]["types"];
const TYPES: { re: RegExp; key: TypeKey }[] = [
  { re: /dagvaarding/i, key: "dagvaarding" },
  { re: /beslaglegging|\bbeslag\b|loonbeslag|bankbeslag/i, key: "beslag" },
  { re: /dwangbevel/i, key: "dwangbevel" },
  { re: /ingebrekestelling|sommatie|laatste aanmaning|laatste herinnering|laatste kans/i, key: "laatste" },
  { re: /\bCJIB\b|Centraal Justitieel Incassobureau/i, key: "cjib" },
  { re: /aanmaning/i, key: "aanmaning" },
  { re: /betalingsherinnering|herinnering/i, key: "herinnering" },
  { re: /terugvordering|terugbetalen|terug te betalen|terugvorderen/i, key: "terugvordering" },
  { re: /zorgtoeslag|huurtoeslag|kinderopvangtoeslag|kindgebonden budget|voorschot .{0,20}toeslag|toeslag.{0,20}voorschot/i, key: "toeslag" },
  { re: /voorlopige aanslag/i, key: "voorlopigeAanslag" },
  { re: /WOZ[- ]?beschikking|WOZ[- ]?waarde|waarde van uw woning/i, key: "woz" },
  { re: /aangifte (inkomstenbelasting|doen)|uitnodiging .{0,40}aangifte|aangiftebrief/i, key: "aangifte" },
  { re: /definitieve aanslag|\baanslag\b/i, key: "aanslag" },
  { re: /beschikking/i, key: "beschikking" },
  { re: /\bboete\b|bekeuring|verkeersboete|naheffing/i, key: "boete" },
  { re: /huurverhoging|huurprijs (wordt )?verhoogd|nieuwe huurprijs|jaarlijkse huuraanpassing/i, key: "huurverhoging" },
  { re: /jaarafrekening|eindafrekening|jaarnota/i, key: "jaarafrekening" },
  { re: /\bfactuur\b|\bnota\b|factuurnummer/i, key: "factuur" },
  { re: /uitnodiging|afspraak|oproep/i, key: "uitnodiging" },
  { re: /besluit|toekenning|afwijzing|toegekend|afgewezen/i, key: "besluit" },
  { re: /jaaropgave|jaaroverzicht|overzicht/i, key: "overzicht" },
];

const RED_WORDS =
  /dagvaarding|beslag|deurwaarder|ingebrekestelling|sommatie|laatste aanmaning|laatste herinnering|afsluit|afgesloten|ontruiming|huisuitzetting|stopzetten|stop(t|pen) met|gijzeling|dwangbevel|verhoging|verhoogd|incassokosten/i;
const REFUND = /(u krijgt|terugbetal(ing|en wij)|wij betalen (u|het bedrag)|wordt (aan u )?(uit|over)betaald|teruggaaf|terug te ontvangen|ontvangt u|storten wij|wordt (op uw rekening )?overgemaakt)/i;
const AUTO_DEBIT = /automatische incasso|automatisch afgeschreven|wordt (automatisch )?afgeschreven|incasseren wij|machtiging/i;
const NOTHING_TO_DO = /u hoeft (hier)?(voor )?niets te doen|geen actie (nodig|vereist)|ter informatie/i;
const ACTION_SENTENCE =
  /(u moet|wij vragen u|wilt u|graag ontvangen wij|stuur|vul .* in|lever|reageer|neem (dan )?contact|maak een afspraak|geef .* door|betaal|maak .* over|meld u|log in)/i;

const SCAM: { re: RegExp; key: "scamCrypto" | "scamHurry" | "scamPolice" }[] = [
  { re: /bitcoin|crypto|cadeaukaart|giftcard|gift card|paysafecard|google play kaart|itunes/i, key: "scamCrypto" },
  { re: /binnen 24 uur|binnen 48 uur|vandaag nog betalen|direct betalen anders/i, key: "scamHurry" },
  { re: /arrestatie|gearresteerd|politie komt|aanhouding/i, key: "scamPolice" },
];

function findDifficultWords(text: string, glossary: Record<string, string>) {
  const low = text.toLowerCase();
  return Object.entries(glossary)
    .filter(([w]) => new RegExp(`(^|[^a-zà-ÿ])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(low))
    .sort((a, b) => b[0].length - a[0].length)
    .slice(0, 6)
    .map(([word, meaning]) => ({ word: capitalize(word === "digid" ? "DigiD" : word), meaning }));
}

const UNITS: Record<string, "weken" | "dagen" | "maanden"> = { weken: "weken", week: "weken", dagen: "dagen", dag: "dagen", maanden: "maanden", maand: "maanden" };

// ---------- Alles samen ----------
export interface LocalResult {
  analysis: Analysis;
  text: string;
  typeKey: string;
}

export function explainLocally(rawText: string, confidence: number, today: string, t: Dict, loc = "nl-NL"): LocalResult {
  const r = t.r;
  const date = (iso: string) => fmtDate(iso, loc);
  const euro = (n: number) => formatEuro(n, loc);
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
  const readable = letters >= 120 && confidence >= 40;

  const found = findSender(text);
  const sender = { name: found.name || r.unknownSender, type: found.type };
  const typeKey: TypeKey = TYPES.find((x) => x.re.test(text))?.key ?? "brief";
  const letterType = r.types[typeKey];
  const dates = findDates(text);
  const letterDate = findLetterDate(dates, today);
  const deadline = findDeadline(text, dates, letterDate, today);
  const amounts = findAmounts(text);
  const iban = findIban(text);
  const references = findReferences(text);
  const payRef = findPaymentReference(text) ?? references.find((x) => /betalingskenmerk|betaalkenmerk/i.test(x.label))?.value ?? null;
  const refDigits = payRef ? payRef.replace(/\D/g, "").length : 0;
  const phone = findPhone(text);
  const email = findEmail(text);
  const website = findWebsite(text);

  const isRefund = REFUND.test(text) && !/u moet .{0,30}betalen/i.test(text);
  const isAutoDebit = AUTO_DEBIT.test(text) && !/incassobureau/i.test(text);
  const total =
    amounts.find((a) => TOTAL_WORDS.test(a.label)) ?? (amounts.length ? amounts.reduce((m, a) => (a.value > m.value ? a : m)) : null);
  const needsPayment =
    !isRefund && !isAutoDebit && typeKey !== "woz" && !!total && (!!iban || /betaal|over te maken|maak .* over|voldoen/i.test(text));

  const toLine = text.match(/t\.?\s?n\.?\s?v\.?\s*:?\s*([^\n,]{3,50})/i)?.[1]?.trim() ?? null;

  // Oplichting?
  const signals = SCAM.filter((x) => x.re.test(text)).map((x) => r[x.key]);
  if (iban && !iban.startsWith("NL") && ["belastingdienst", "toeslagen", "gemeente", "cjib", "uwv", "svb", "duo"].includes(sender.type)) {
    signals.push(r.scamForeignIban);
  }
  const suspicious = signals.length > 0;

  // Bezwaar
  const bezwaarSentence = sentences(text).find((x) => /bezwaar/i.test(x));
  const bt = text.match(/binnen\s+(\d+|[a-zé]+)\s+(weken|week|dagen|dag|maanden|maand)[^.]{0,60}bezwaar|bezwaar[^.]{0,80}binnen\s+(\d+|[a-zé]+)\s+(weken|week|dagen|dag|maanden|maand)/i);
  let objectionTerm: string | null = null;
  if (bt) {
    const nRaw = (bt[1] ?? bt[3]).toLowerCase();
    const n = /^\d+$/.test(nRaw) ? nRaw : String(NUMBER_WORDS[nRaw] ?? nRaw);
    objectionTerm = r.objectionTerm(n, UNITS[(bt[2] ?? bt[4]).toLowerCase()] ?? "weken");
  }
  const objection = {
    possible: !!bezwaarSentence,
    deadline: objectionTerm,
    how: bezwaarSentence ? r.quote(bezwaarSentence) : null,
  };

  // Urgentie
  const days = deadline ? diffDays(today, deadline.date) : null;
  let level: Urgency = "oranje";
  let reason = r.reasonDefault;
  if (suspicious && needsPayment) {
    level = "rood";
    reason = r.reasonScam;
  } else if (RED_WORDS.test(text.replace(/huur\s?verhoging|huurprijs (wordt )?verhoogd/gi, "")) && !isRefund) {
    level = "rood";
    reason = r.reasonSerious;
  } else if (days !== null && days <= 14 && !isRefund) {
    level = "rood";
    reason = days < 0 ? r.reasonPast : r.reasonDays(days);
  } else if (isRefund || isAutoDebit || (NOTHING_TO_DO.test(text) && !needsPayment)) {
    level = "groen";
    reason = isRefund ? r.reasonRefund : isAutoDebit ? r.reasonAutoDebit : r.reasonInfo;
  } else if (!needsPayment && !deadline && !ACTION_SENTENCE.test(text) && typeKey !== "woz") {
    level = "groen";
    reason = r.reasonNoAction;
  } else if (days !== null) {
    reason = r.reasonPlenty(days);
  }

  // Stappen
  const actions: { step: string; detail: string | null }[] = [];
  const by = deadline ? r.by(date(deadline.date)) : "";
  if (suspicious) actions.push({ step: r.stepNoPay, detail: r.stepNoPayDetail });
  if (needsPayment && total) {
    actions.push({ step: r.stepCheck, detail: r.stepCheckDetail });
    actions.push({
      step: r.stepPay(euro(total.value), by),
      detail:
        (iban || toLine || payRef ? r.payParts(iban, toLine, payRef) : r.payOnLetter) +
        (refDigits && refDigits !== 16 && refDigits !== 7 ? r.refWarning : ""),
    });
    actions.push({ step: r.stepCantPay(by || r.soon), detail: r.stepCantPayDetail });
  } else if (isRefund) {
    actions.push({ step: r.stepRefund, detail: r.stepRefundDetail });
  } else if (isAutoDebit) {
    actions.push({ step: r.stepAutoDebit, detail: r.stepAutoDebitDetail });
  }
  if (typeKey === "aangifte") actions.push({ step: r.stepAangifte(by), detail: r.stepAangifteDetail });
  if (typeKey === "woz") actions.push({ step: r.stepWoz, detail: r.stepWozDetail });
  const actionSentence =
    typeKey === "aangifte"
      ? null
      : sentences(text).find(
          (x) => ACTION_SENTENCE.test(x) && !/bezwaar/i.test(x) && !(needsPayment && /betal|betaal|over te maken|regeling/i.test(x)),
        );
  if (actionSentence) actions.push({ step: r.stepDoAsked(by), detail: r.quote(actionSentence) });
  if (/dagvaarding|rechtbank|kantonrechter/i.test(text)) actions.push({ step: r.stepCourt, detail: r.stepCourtDetail });
  if (objection.possible) actions.push({ step: r.stepObjection, detail: objection.deadline ?? r.objectionCheck });
  actions.push({ step: r.stepKeep, detail: r.stepKeepDetail });

  // Kop en samenvatting
  const baseName = sender.name.replace(/\s*\(namens .*\)$/, "");
  const shortSender = baseName.length > 45 ? baseName.slice(0, 45) + "…" : baseName;
  let headline: string;
  if (!readable) headline = r.hlUnreadable;
  else if (isRefund && total) headline = r.hlRefund(euro(total.value), shortSender);
  else if (needsPayment && total) headline = r.hlPay(euro(total.value), shortSender, deadline ? date(deadline.date) : null);
  else if (deadline) headline = r.hlDeadline(date(deadline.date));
  else headline = r.hlGeneric(shortSender);

  const summaryParts = [r.sumIntro(sender.name, letterType.charAt(0).toLocaleLowerCase(loc) + letterType.slice(1))];
  if (letterDate) summaryParts.push(r.sumDate(date(letterDate)));
  if (needsPayment && total) summaryParts.push(r.sumAmount(euro(total.value)));
  if (isAutoDebit) summaryParts.push(r.sumAutoDebit);
  if (deadline?.is_estimate) summaryParts.push(r.sumEstimated(date(deadline.date)));
  summaryParts.push(r.sumLocal);

  const help: Analysis["help"] = [];
  if (suspicious) help.push({ name: "Fraudehelpdesk", why: r.helpFraud, contact: "088 - 786 73 72" });
  if (["belastingdienst", "toeslagen"].includes(sender.type)) help.push({ name: "BelastingTelefoon", why: r.helpTax, contact: "0800 - 0543" });
  if (needsPayment || ["incassobureau", "deurwaarder", "cjib"].includes(sender.type)) {
    help.push({ name: "Geldfit", why: r.helpGeldfit, contact: "geldfit.nl" });
    help.push({ name: r.helpDebtName, why: r.helpDebt, contact: r.helpDebtContact });
  }
  if (["rechtbank", "deurwaarder"].includes(sender.type) || objection.possible)
    help.push({ name: "Het Juridisch Loket", why: r.helpLegal, contact: "0800 - 8020" });

  const amountList = amounts
    .filter((a, i, arr) => arr.findIndex((b) => b.value === a.value) === i)
    .slice(0, 6)
    .map((a) => ({ amount: euro(a.value), description: a.label === "Bedrag" ? r.amount : a.label }));

  // Zelfcontrole: tellen de losse bedragen op tot het totaal?
  let sumOk: boolean | undefined;
  if (total && TOTAL_WORDS.test(total.label)) {
    const parts = amounts.filter((a) => a !== total && a.index < total.index && !TOTAL_WORDS.test(a.label));
    const uniq = parts.filter((a, i, arr) => arr.findIndex((b) => b.value === a.value && b.label === a.label) === i);
    if (uniq.length >= 2) sumOk = Math.abs(uniq.reduce((s2, a) => s2 + a.value, 0) - total.value) < 0.011;
  }

  const analysis: Analysis = {
    checks: { ibanValid: !!iban, sumOk },
    letter_date: letterDate,
    is_letter: letters >= 60,
    readable,
    photo_tip: readable ? null : r.photoTip,
    sender,
    letter_type: letterType,
    headline,
    summary: summaryParts.join(" "),
    urgency: { level, reason },
    actions,
    deadline: deadline
      ? { date: deadline.date, what: needsPayment ? r.whatPay : r.whatRespond, is_estimate: deadline.is_estimate }
      : { date: null, what: null, is_estimate: false },
    amounts: amountList,
    payment: { needed: needsPayment, amount: total ? euro(total.value) : null, iban, to: toLine, reference: payRef },
    references: references.filter((x) => !/betalingskenmerk|betaalkenmerk/i.test(x.label)),
    contact: { phone, website, email },
    objection,
    if_you_do_nothing: needsPayment ? r.ifNothingPay : null,
    difficult_words: findDifficultWords(text, r.glossary),
    scam_check: { suspicious, signals },
    help: help.slice(0, 3),
  };
  return { analysis, text, typeKey };
}
