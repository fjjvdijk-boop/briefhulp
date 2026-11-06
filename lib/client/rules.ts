// Gratis uitleg zonder AI: vaste regels die belangrijke dingen uit de brieftekst halen.
// Minder slim dan de AI-uitleg, maar het kost niets en werkt helemaal op de telefoon.
import type { Analysis, SenderType, Urgency } from "../types";

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
export function nlDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
const formatEuro = (n: number) =>
  "€ " + n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    if (validDate(y, mo, d)) hits.push({ iso: toIso(y, mo, d), index: m.index!, before: text.slice(Math.max(0, m.index! - 70), m.index!) });
  }
  const num = /\b(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})\b/g;
  for (const m of text.matchAll(num)) {
    const d = +m[1], mo = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    if (validDate(y, mo, d)) hits.push({ iso: toIso(y, mo, d), index: m.index!, before: text.slice(Math.max(0, m.index! - 70), m.index!) });
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
    (d) => DEADLINE_WORDS.test(d.before) && d.iso !== letterDate && diffDays(from, d.iso) >= 0 && diffDays(from, d.iso) < 400,
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
function findIban(text: string) {
  const re = /\b([A-Z]{2}\s{0,3}\d{2}(?:\s{0,3}[A-Z0-9]){10,30})/g;
  const upper = text.toUpperCase().replace(/O(?=\d)/g, "0");
  for (const m of upper.matchAll(re)) {
    // probeer steeds kortere stukken (er kan tekst achter staan)
    const compact = m[1].replace(/\s/g, "");
    for (let len = Math.min(compact.length, 34); len >= 15; len--) {
      const cand = compact.slice(0, len);
      if (ibanValid(cand)) return cand.replace(/(.{4})/g, "$1 ").trim();
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
  return { name: first ? cleanName(first) : "Onbekende afzender", type: "overig" };
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

const TYPES: { re: RegExp; label: string }[] = [
  { re: /dagvaarding/i, label: "Dagvaarding: u moet reageren bij de rechter" },
  { re: /beslaglegging|\bbeslag\b|loonbeslag|bankbeslag/i, label: "Beslag: er wordt geld of spullen van u ingehouden" },
  { re: /dwangbevel/i, label: "Dwangbevel: officieel bevel om te betalen" },
  { re: /ingebrekestelling|sommatie|laatste aanmaning|laatste herinnering|laatste kans/i, label: "Laatste waarschuwing om te betalen" },
  { re: /aanmaning/i, label: "Aanmaning: u heeft nog niet (alles) betaald" },
  { re: /betalingsherinnering|herinnering/i, label: "Herinnering: u moet nog iets doen of betalen" },
  { re: /terugvordering|terugbetalen|terug te betalen|terugvorderen/i, label: "Terugvordering: u moet geld terugbetalen" },
  { re: /voorlopige aanslag/i, label: "Voorlopige aanslag (belasting)" },
  { re: /definitieve aanslag|\baanslag\b/i, label: "Aanslag: bedrag aan belasting" },
  { re: /beschikking/i, label: "Beschikking: een officieel besluit over u" },
  { re: /\bboete\b|bekeuring|verkeersboete|naheffing/i, label: "Boete" },
  { re: /\bfactuur\b|\bnota\b|factuurnummer/i, label: "Rekening (factuur)" },
  { re: /uitnodiging|afspraak|oproep/i, label: "Uitnodiging of afspraak" },
  { re: /besluit|toekenning|afwijzing|toegekend|afgewezen/i, label: "Besluit over uw aanvraag" },
  { re: /jaaropgave|jaaroverzicht|overzicht/i, label: "Overzicht (ter informatie)" },
];

const RED_WORDS =
  /dagvaarding|beslag|deurwaarder|ingebrekestelling|sommatie|laatste aanmaning|laatste herinnering|afsluit|afgesloten|ontruiming|huisuitzetting|stopzetten|stop(t|pen) met|gijzeling|dwangbevel|verhoging|incassokosten/i;
const REFUND = /(u krijgt|terugbetal(ing|en wij)|wij betalen (u|het bedrag)|wordt (aan u )?(uit|over)betaald|teruggaaf|terug te ontvangen|ontvangt u|storten wij|wordt (op uw rekening )?overgemaakt)/i;
const AUTO_DEBIT = /automatische incasso|automatisch afgeschreven|wordt (automatisch )?afgeschreven|incasseren wij|machtiging/i;
const NOTHING_TO_DO = /u hoeft (hier)?(voor )?niets te doen|geen actie (nodig|vereist)|ter informatie/i;
const ACTION_SENTENCE =
  /(u moet|wij vragen u|wilt u|graag ontvangen wij|stuur|vul .* in|lever|reageer|neem (dan )?contact|maak een afspraak|geef .* door|betaal|maak .* over|meld u|log in)/i;

const SCAM: { re: RegExp; signal: string }[] = [
  { re: /bitcoin|crypto|cadeaukaart|giftcard|gift card|paysafecard|google play kaart|itunes/i, signal: "Er wordt gevraagd om te betalen met cadeaukaarten of crypto. Echte organisaties doen dat nooit." },
  { re: /binnen 24 uur|binnen 48 uur|vandaag nog betalen|direct betalen anders/i, signal: "Er wordt heel veel haast gemaakt. Dat is een bekend trucje van oplichters." },
  { re: /arrestatie|gearresteerd|politie komt|aanhouding/i, signal: "Er wordt gedreigd met de politie of arrestatie." },
];

// ---------- Moeilijke woorden ----------
const GLOSSARY: Record<string, string> = {
  aanslag: "Een brief waarin staat hoeveel belasting u moet betalen of terugkrijgt.",
  "voorlopige aanslag": "Een schatting van uw belasting. Later volgt het echte (definitieve) bedrag.",
  aanmaning: "Een brief omdat u te laat bent met betalen. Er kunnen extra kosten bij komen.",
  beschikking: "Een officieel besluit van een overheidsorganisatie over u.",
  bezwaar: "Officieel laten weten dat u het niet eens bent met een besluit. Dat moet op tijd.",
  beroep: "Naar de rechter gaan als u het niet eens bent met de uitkomst van uw bezwaar.",
  dagtekening: "De datum die op de brief staat. Termijnen tellen vaak vanaf deze datum.",
  incassokosten: "Extra kosten omdat u te laat betaalt. Daar zit een wettelijk maximum aan.",
  incassobureau: "Een bedrijf dat geld ophaalt voor een ander bedrijf als een rekening niet betaald is.",
  deurwaarder: "Iemand die door de rechter mag zorgen dat schulden betaald worden, bijvoorbeeld met beslag.",
  dagvaarding: "Een officiële oproep om bij de rechter te komen of te reageren in een rechtszaak.",
  beslag: "Er wordt geld (loon, uitkering, bankrekening) of spullen van u ingehouden om een schuld te betalen.",
  ingebrekestelling: "Een officiële laatste kans om te betalen of iets te doen.",
  sommatie: "Een dringende eis om te betalen, vaak met een korte termijn.",
  dwangbevel: "Een officieel bevel om te betalen. Daarna kan beslag volgen.",
  terugvordering: "U heeft te veel geld gekregen en moet dat terugbetalen.",
  betalingskenmerk: "Een nummer dat u bij de betaling invult. Zo weten ze dat het geld van u is.",
  betalingsregeling: "Een afspraak om een bedrag in kleinere delen te betalen.",
  "o.v.v.": "'Onder vermelding van': zet dit nummer bij uw betaling.",
  "t.n.v.": "'Ten name van': de naam van wie het geld krijgt.",
  verschuldigd: "Wat u moet betalen.",
  vordering: "Het geld dat iemand nog van u krijgt.",
  termijn: "De tijd die u krijgt om iets te doen.",
  "wettelijke rente": "Extra geld dat u moet betalen omdat u te laat bent. Het percentage staat in de wet.",
  invordering: "Het ophalen van geld dat u nog moet betalen.",
  toeslag: "Geld van de overheid om te helpen betalen, bijvoorbeeld voor huur of zorgverzekering.",
  "eigen risico": "Het deel van de zorgkosten dat u zelf moet betalen voordat de verzekering betaalt.",
  premie: "Het bedrag dat u elke maand betaalt voor een verzekering.",
  verhoging: "Een extra bedrag bovenop een boete omdat u te laat betaalt.",
  machtiging: "Toestemming om geld automatisch van uw rekening af te schrijven.",
  "automatische incasso": "Het bedrag wordt vanzelf van uw rekening gehaald. U hoeft niet zelf over te maken.",
  peildatum: "De datum waarop gekeken wordt naar uw situatie.",
  "gemeentelijke belastingen": "Belastingen voor de gemeente en het waterschap, zoals afvalstoffenheffing en OZB.",
  ozb: "Onroerendezaakbelasting: belasting voor wie een huis of gebouw heeft.",
  "woz-waarde": "De waarde van uw huis volgens de gemeente. Daarop worden belastingen berekend.",
  kwijtschelding: "U hoeft (een deel van) de belasting niet te betalen, omdat u weinig geld heeft. U moet het wel aanvragen.",
  uitstel: "U krijgt meer tijd om te betalen of iets te doen.",
};

function findDifficultWords(text: string) {
  const low = text.toLowerCase();
  return Object.entries(GLOSSARY)
    .filter(([w]) => low.includes(w))
    .sort((a, b) => b[0].length - a[0].length)
    .slice(0, 6)
    .map(([word, meaning]) => ({ word: capitalize(word), meaning }));
}

// ---------- Alles samen ----------
export interface LocalResult {
  analysis: Analysis;
  text: string;
}

export function explainLocally(rawText: string, confidence: number, today: string): LocalResult {
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
  const readable = letters >= 120 && confidence >= 40;

  const sender = findSender(text);
  const letterType = TYPES.find((t) => t.re.test(text))?.label ?? "Brief";
  const dates = findDates(text);
  const letterDate = findLetterDate(dates, today);
  const deadline = findDeadline(text, dates, letterDate, today);
  const amounts = findAmounts(text);
  const iban = findIban(text);
  const references = findReferences(text);
  const payRef = findPaymentReference(text) ?? references.find((r) => /betalingskenmerk|betaalkenmerk/i.test(r.label))?.value ?? null;
  const refDigits = payRef ? payRef.replace(/\D/g, "").length : 0;
  const phone = findPhone(text);
  const email = findEmail(text);
  const website = findWebsite(text);

  const isRefund = REFUND.test(text) && !/u moet .{0,30}betalen/i.test(text);
  const isAutoDebit = AUTO_DEBIT.test(text) && !/incassobureau/i.test(text);
  const total =
    amounts.find((a) => TOTAL_WORDS.test(a.label)) ?? (amounts.length ? amounts.reduce((m, a) => (a.value > m.value ? a : m)) : null);
  const needsPayment = !isRefund && !isAutoDebit && !!total && (!!iban || /betaal|over te maken|maak .* over|voldoen/i.test(text));

  const toLine = text.match(/t\.?\s?n\.?\s?v\.?\s*:?\s*([^\n,]{3,50})/i)?.[1]?.trim() ?? null;

  // Oplichting?
  const signals = SCAM.filter((s) => s.re.test(text)).map((s) => s.signal);
  if (iban && !iban.startsWith("NL") && ["belastingdienst", "toeslagen", "gemeente", "cjib", "uwv", "svb", "duo"].includes(sender.type)) {
    signals.push("Het rekeningnummer is niet Nederlands, terwijl de brief van een Nederlandse overheid lijkt te komen.");
  }
  const suspicious = signals.length > 0;

  // Bezwaar
  const bezwaarSentence = sentences(text).find((s) => /bezwaar/i.test(s));
  const bezwaarTermijn = text.match(/binnen\s+(\d+|[a-zé]+)\s+(weken|dagen|maanden)[^.]{0,60}bezwaar|bezwaar[^.]{0,80}binnen\s+(\d+|[a-zé]+)\s+(weken|dagen|maanden)/i);
  const objection = {
    possible: !!bezwaarSentence,
    deadline: bezwaarTermijn ? `Binnen ${bezwaarTermijn[1] ?? bezwaarTermijn[3]} ${bezwaarTermijn[2] ?? bezwaarTermijn[4]} na de datum van de brief.` : null,
    how: bezwaarSentence ?? null,
  };

  // Urgentie
  const days = deadline ? diffDays(today, deadline.date) : null;
  let level: Urgency = "oranje";
  let reason = "U moet waarschijnlijk iets doen. Lees de stappen hieronder.";
  if (suspicious && needsPayment) {
    level = "rood";
    reason = "Deze brief lijkt op oplichting. Betaal niet voordat u het heeft gecontroleerd.";
  } else if (RED_WORDS.test(text) && !isRefund) {
    level = "rood";
    reason = "In de brief staan woorden die wijzen op een serieuze situatie, zoals extra kosten, een deurwaarder of de rechter.";
  } else if (days !== null && days <= 14 && !isRefund) {
    level = "rood";
    reason = days < 0 ? "De datum in de brief is al voorbij." : `U heeft nog ${days} ${days === 1 ? "dag" : "dagen"}.`;
  } else if (isRefund || isAutoDebit || (NOTHING_TO_DO.test(text) && !needsPayment)) {
    level = "groen";
    reason = isRefund
      ? "U krijgt geld. U hoeft meestal niets te doen."
      : isAutoDebit
        ? "Het bedrag wordt automatisch afgeschreven. Zorg dat er genoeg geld op uw rekening staat."
        : "Deze brief is vooral ter informatie.";
  } else if (!needsPayment && !deadline && !ACTION_SENTENCE.test(text)) {
    level = "groen";
    reason = "Er staat geen betaling of datum in waarvoor u iets moet doen.";
  } else if (days !== null) {
    reason = `U heeft nog ${days} dagen. Dat is genoeg tijd, maar wacht niet te lang.`;
  }

  // Stappen
  const actions: { step: string; detail: string | null }[] = [];
  const by = deadline ? ` vóór ${nlDate(deadline.date)}` : "";
  if (suspicious) {
    actions.push({
      step: "Betaal nog niet",
      detail: "Zoek zelf het telefoonnummer op de officiële website van de organisatie en vraag of de brief echt is. Gebruik niet het nummer uit de brief.",
    });
  }
  if (needsPayment && total) {
    actions.push({ step: "Controleer of het bedrag klopt", detail: "Kijk of u dit al betaald heeft, bijvoorbeeld in uw bankapp." });
    const parts = [iban ? `Rekeningnummer: ${iban}` : null, toLine ? `Naam: ${toLine}` : null, payRef ? `Kenmerk: ${payRef}` : null].filter(Boolean);
    actions.push({
      step: `Betaal ${formatEuro(total.value)}${by}`,
      detail:
        (parts.length ? `${parts.join(". ")}. Neem het kenmerk precies over.` : "De betaalgegevens staan op de brief.") +
        (refDigits && refDigits !== 16 && refDigits !== 7
          ? " Let op: het kenmerk is misschien niet helemaal goed gelezen. Neem het over van de brief zelf."
          : ""),
    });
    actions.push({
      step: `Kunt u niet (alles) betalen? Neem dan${by || " snel"} contact op`,
      detail: "Vraag om een betalingsregeling. Dat mag. Wachten maakt het vaak duurder.",
    });
  } else if (isRefund) {
    actions.push({ step: "U hoeft waarschijnlijk niets te doen", detail: "Controleer later in uw bankapp of het geld is binnengekomen." });
  } else if (isAutoDebit) {
    actions.push({ step: "Zorg dat er genoeg geld op uw rekening staat", detail: "Het bedrag wordt automatisch afgeschreven." });
  }
  const actionSentence = sentences(text).find((s) => ACTION_SENTENCE.test(s) && !/bezwaar/i.test(s) && !(needsPayment && /betal|betaal|over te maken|regeling/i.test(s)));
  if (actionSentence) {
    actions.push({ step: `Doe wat de brief vraagt${by}`, detail: `In de brief staat: "${actionSentence}"` });
  }
  if (/dagvaarding|rechtbank|kantonrechter/i.test(text)) {
    actions.push({
      step: "Zoek op wanneer u moet reageren of naar de rechter moet",
      detail: "Neem snel contact op met Het Juridisch Loket (0800 - 8020, gratis) voor advies.",
    });
  }
  if (objection.possible) {
    actions.push({
      step: "Bent u het niet eens? Maak op tijd bezwaar",
      detail: objection.deadline ?? "Kijk in de brief hoe lang u daarvoor heeft.",
    });
  }
  actions.push({ step: "Bewaar de brief", detail: "Leg hem bij uw belangrijke papieren." });

  // Kop en samenvatting
  const baseName = sender.name.replace(/\s*\(namens .*\)$/, "");
  const shortSender = baseName.length > 45 ? baseName.slice(0, 45) + "…" : baseName;
  let headline: string;
  if (!readable) headline = "De brief was niet goed te lezen.";
  else if (isRefund && total) headline = `U krijgt waarschijnlijk ${formatEuro(total.value)} van ${shortSender}.`;
  else if (needsPayment && total) headline = `U moet ${formatEuro(total.value)} betalen aan ${shortSender}${deadline ? `, uiterlijk ${nlDate(deadline.date)}` : ""}.`;
  else if (deadline) headline = `U moet iets doen vóór ${nlDate(deadline.date)}.`;
  else headline = `Brief van ${shortSender}.`;

  const summaryParts = [`Dit is een brief van ${sender.name}. Soort brief: ${letterType.toLowerCase()}.`];
  if (letterDate) summaryParts.push(`De brief is van ${nlDate(letterDate)}.`);
  if (needsPayment && total) summaryParts.push(`Het bedrag is ${formatEuro(total.value)}.`);
  if (isAutoDebit) summaryParts.push("Het bedrag wordt automatisch van uw rekening gehaald.");
  if (deadline?.is_estimate) summaryParts.push(`De datum ${nlDate(deadline.date)} is uitgerekend vanaf de datum van de brief.`);
  summaryParts.push("Deze snelle uitleg is automatisch gemaakt op uw telefoon. Controleer alles op de brief zelf.");

  const help: Analysis["help"] = [];
  if (suspicious) help.push({ name: "Fraudehelpdesk", why: "Bij twijfel of een brief echt is.", contact: "088 - 786 73 72" });
  if (["belastingdienst", "toeslagen"].includes(sender.type))
    help.push({ name: "BelastingTelefoon", why: "Vragen over belasting of toeslagen.", contact: "0800 - 0543" });
  if (needsPayment || ["incassobureau", "deurwaarder", "cjib"].includes(sender.type)) {
    help.push({ name: "Geldfit", why: "Gratis en anoniem hulp als u moeite heeft met betalen.", contact: "geldfit.nl" });
    help.push({ name: "Schuldhulpverlening van uw gemeente", why: "Gratis hulp als u meer rekeningen niet kunt betalen.", contact: "Via de website van uw gemeente" });
  }
  if (["rechtbank", "deurwaarder"].includes(sender.type) || objection.possible)
    help.push({ name: "Het Juridisch Loket", why: "Gratis advies over bezwaar, de rechter of een deurwaarder.", contact: "0800 - 8020" });

  const amountList = amounts
    .filter((a, i, arr) => arr.findIndex((b) => b.value === a.value) === i)
    .slice(0, 6)
    .map((a) => ({ amount: formatEuro(a.value), description: a.label }));

  const analysis: Analysis = {
    is_letter: letters >= 60,
    readable,
    photo_tip: readable
      ? null
      : "De tekst was moeilijk te lezen. Leg de brief plat op tafel, zorg voor veel licht en houd de telefoon recht boven de brief.",
    sender,
    letter_type: letterType,
    headline,
    summary: summaryParts.join(" "),
    urgency: { level, reason },
    actions,
    deadline: deadline
      ? { date: deadline.date, what: needsPayment ? "Betalen" : "Reageren op de brief", is_estimate: deadline.is_estimate }
      : { date: null, what: null, is_estimate: false },
    amounts: amountList,
    payment: {
      needed: needsPayment,
      amount: total ? formatEuro(total.value) : null,
      iban,
      to: toLine,
      reference: payRef,
    },
    references: references.filter((r) => !/betalingskenmerk|betaalkenmerk/i.test(r.label)),
    contact: { phone, website, email },
    objection,
    if_you_do_nothing: needsPayment
      ? "Als u niet op tijd betaalt, kunnen er extra kosten bijkomen. Later kan een incassobureau of deurwaarder worden ingeschakeld."
      : null,
    difficult_words: findDifficultWords(text),
    scam_check: { suspicious, signals },
    help: help.slice(0, 3),
  };
  return { analysis, text };
}
