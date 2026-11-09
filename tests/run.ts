// Draait alle testbrieven door de gratis uitleg en laat zien wat goed en fout gaat.
import { explainLocally } from "../lib/client/rules";
import { getDict, BUILT_IN_ORDER, registerExtra, registerLang } from "../lib/i18n";
import { ar as arD } from "../lib/i18n/ar";
import { tr as trD } from "../lib/i18n/tr";
import { pl as plD } from "../lib/i18n/pl";
import { uk as ukD } from "../lib/i18n/uk";
import { ru as ruD } from "../lib/i18n/ru";
import { ro as roD } from "../lib/i18n/ro";
import { es as esD } from "../lib/i18n/es";
import { fr as frD } from "../lib/i18n/fr";
import { fa as faD } from "../lib/i18n/fa";
import { so as soD } from "../lib/i18n/so";
import { pt as ptD } from "../lib/i18n/pt";
Object.entries({ ar: arD, tr: trD, pl: plD, uk: ukD, ru: ruD, ro: roD, es: esD, fr: frD, fa: faD, so: soD, pt: ptD }).forEach(([c, x]) => registerLang(c, x));
import { extra as arX } from "../lib/i18n/extra/ar";
import { extra as trX } from "../lib/i18n/extra/tr";
import { extra as plX } from "../lib/i18n/extra/pl";
import { extra as ukX } from "../lib/i18n/extra/uk";
import { extra as ruX } from "../lib/i18n/extra/ru";
import { extra as roX } from "../lib/i18n/extra/ro";
import { extra as esX } from "../lib/i18n/extra/es";
import { extra as frX } from "../lib/i18n/extra/fr";
import { extra as faX } from "../lib/i18n/extra/fa";
import { extra as soX } from "../lib/i18n/extra/so";
import { extra as ptX } from "../lib/i18n/extra/pt";
Object.entries({ ar: arX, tr: trX, pl: plX, uk: ukX, ru: ruX, ro: roX, es: esX, fr: frX, fa: faX, so: soX, pt: ptX }).forEach(([c, x]) => registerExtra(c, x));
import { legalKeys } from "../scripts/legal-strings";
import LEGAL_KEYS_JSON from "../lib/legal/tr/keys.json";
import ar from "../lib/legal/tr/ar";
import trL from "../lib/legal/tr/tr";
import pl from "../lib/legal/tr/pl";
import uk from "../lib/legal/tr/uk";
import ru from "../lib/legal/tr/ru";
import ro from "../lib/legal/tr/ro";
import es from "../lib/legal/tr/es";
import fr from "../lib/legal/tr/fr";
import fa from "../lib/legal/tr/fa";
import so from "../lib/legal/tr/so";
import pt from "../lib/legal/tr/pt";
const LEGAL_TR = { ar, tr: trL, pl, uk, ru, ro, es, fr, fa, so, pt };
import { removeShadows } from "../lib/client/ocr";
import { chunkText, letterToSpeech, pickVoice, prepareForSpeech } from "../lib/client/speech";
import { CASES, TODAY } from "./letters";
import { routeKind, relevantTopics, disagreeRoute } from "../lib/legal/route";
import { TOPICS } from "../lib/legal/topics";
import { epcPayload, linkStatus, paymentSafe } from "../lib/client/pay";
import { availableReplies, buildReply } from "../lib/client/reply";

const t = getDict("nl");
let passed = 0;
let failed = 0;
const fails: string[] = [];

for (const c of CASES) {
  const { analysis: a, typeKey } = explainLocally(c.text, 95, TODAY, t, "nl-NL");
  const e = c.expect;
  const checks: [string, boolean, unknown, unknown][] = [];
  const add = (label: string, ok: boolean, got: unknown, want: unknown) => checks.push([label, ok, got, want]);
  if (e.urgency) add("urgentie", a.urgency.level === e.urgency, a.urgency.level, e.urgency);
  if (e.type) add("soort", typeKey === e.type, typeKey, e.type);
  if (e.sender) add("afzender-type", a.sender.type === e.sender, a.sender.type, e.sender);
  if (e.senderName) add("afzender-naam", e.senderName.test(a.sender.name), a.sender.name, String(e.senderName));
  if (e.pay !== undefined) add("betalen", a.payment.needed === e.pay, a.payment.needed, e.pay);
  if (e.amount) add("bedrag", (a.payment.amount ?? "").includes(e.amount), a.payment.amount, e.amount);
  if (e.iban) add("iban", a.payment.iban === e.iban, a.payment.iban, e.iban);
  if (e.reference) add("kenmerk", a.payment.reference === e.reference, a.payment.reference, e.reference);
  if (e.deadline !== undefined) add("deadline", a.deadline.date === e.deadline, a.deadline.date, e.deadline);
  if (e.estimate !== undefined) add("geschat", a.deadline.is_estimate === e.estimate, a.deadline.is_estimate, e.estimate);
  if (e.scam !== undefined) add("nep", a.scam_check.suspicious === e.scam, a.scam_check.suspicious, e.scam);
  if (e.objection !== undefined) add("bezwaar", a.objection.possible === e.objection, a.objection.possible, e.objection);
  if (c.name.startsWith("Incasso: aanmaning")) add("bedragen-optellen", a.checks?.sumOk === true, a.checks?.sumOk, true);
  if (e.route) add("route", routeKind(a, typeKey) === e.route, routeKind(a, typeKey), e.route);
  // Betaalhulp nooit bij een nepbrief; bij een echte betaalbrief met geldig IBAN wél een betaal-QR.
  if (e.scam) add("geen-betaalhulp-bij-nep", !paymentSafe(a) && !(paymentSafe(a) && epcPayload(a)), paymentSafe(a), false);
  if (e.pay && !e.scam && a.payment.iban) add("betaal-qr", !!epcPayload(a), !!epcPayload(a), true);
  // Elke voorgestelde antwoordbrief moet netjes te maken zijn.
  for (const k of availableReplies(a, typeKey)) {
    const letter = buildReply(k, a, { name: "A. Test", address: "Straat 1", postcode: "1234 AB Plaats", phone: "", monthly: "25", reason: "" }, a.letter_date);
    add(`brief-${k}`, !/undefined|null|NaN/.test(letter) && letter.includes("A. Test"), letter.slice(0, 40), "nette brief");
  }
  // Elk onderwerp dat we tonen moet bestaan; elke route-stap heeft tekst.
  add("onderwerpen", relevantTopics(a, typeKey).every((id) => TOPICS.some((x) => x.id === id)), relevantTopics(a, typeKey), "bestaand");
  add("route-stappen", disagreeRoute(a, typeKey).steps.every((st) => st.title.nl && st.text.en), "", "tekst");
  for (const [label, ok, got, want] of checks) {
    if (ok) passed++;
    else {
      failed++;
      fails.push(`  ✗ ${c.name} → ${label}: kreeg ${JSON.stringify(got)}, verwacht ${JSON.stringify(want)}`);
    }
  }
}

// Elke ingebouwde taal moet zonder fouten een uitleg kunnen maken.
for (const code of BUILT_IN_ORDER) {
  try {
    const r = explainLocally(CASES[0].text, 95, TODAY, getDict(code), code);
    if (!r.analysis.headline || r.analysis.actions.length === 0) throw new Error("lege uitleg");
    passed++;
  } catch (err) {
    failed++;
    fails.push(`  ✗ taal ${code}: ${(err as Error).message}`);
  }
}

// Betaal-QR: exact formaat volgens EPC-standaard (versie 002)
{
  const { analysis: a } = explainLocally(CASES[0].text, 95, TODAY, t, "nl-NL");
  const want = ["BCD", "002", "1", "SCT", "", "Incassobureau Noordpunt", "NL91ABNA0417164300", "EUR192.40", "", "", "7002441588901123", ""].join("\n");
  const got = epcPayload(a);
  if (got === want) passed++;
  else {
    failed++;
    fails.push(`  ✗ EPC-QR formaat: kreeg ${JSON.stringify(got)}`);
  }
  // Linkcontrole
  const checks: [string, string][] = [
    ["https://noordpunt-incasso.nl/betalen", "afzender"],
    ["https://betaal-nu-snel.com/pay", "onbekend"],
    ["https://tikkie.me/pay/abc", "bank"],
  ];
  for (const [url, want2] of checks) {
    const got2 = linkStatus(url, a);
    if (got2 === want2) passed++;
    else {
      failed++;
      fails.push(`  ✗ link ${url}: kreeg ${got2}, verwacht ${want2}`);
    }
  }
  const cj = explainLocally(CASES.find((c) => c.name.startsWith("CJIB"))!.text, 95, TODAY, t, "nl-NL").analysis;
  if (linkStatus("https://www.cjib.nl/betalen", cj) === "afzender" && linkStatus("https://cjib-betalen.com", cj) === "onbekend") passed++;
  else {
    failed++;
    fails.push("  ✗ CJIB-linkcontrole");
  }
}

// ---------- Telefoonnummer van de afzender (niet de cijfers van een IBAN) ----------
{
  const t0 = getDict("nl");
  const cases: [string, string | null][] = [
    ["Postbus 1234 Tel: 050 - 123 45 67\nBetaal op NL91 ABNA 0417 1643 00 o.v.v. kenmerk 7002", "050 - 123 45 67"],
    ["Betaal op NL91 ABNA 0417 1643 00.", null],
    ["Bel ons gratis: 0800 - 0543.", "0800 - 0543"],
    ["Dossiernummer 0123456789. Telefoon (088) 123 45 67", null],
  ];
  for (const [text, want] of cases) {
    const got = (explainLocally(text, 95, TODAY, t0, "nl-NL").analysis as unknown as { contact?: { phone: string | null } }).contact?.phone ?? null;
    if (got === want) passed++;
    else {
      failed++;
      fails.push(`  ✗ telefoon in "${text.slice(0, 40)}": kreeg ${JSON.stringify(got)}, verwacht ${JSON.stringify(want)}`);
    }
  }
}

// ---------- Vertalingen kennisbank en stappenplannen: compleet en actueel ----------
{
  const keysNow = legalKeys();
  const stored = LEGAL_KEYS_JSON as string[];
  if (JSON.stringify(keysNow) === JSON.stringify(stored)) passed++;
  else {
    failed++;
    fails.push("  ✗ lib/legal/tr/keys.json is verouderd: draai `npx tsx scripts/legal-strings.ts > lib/legal/tr/keys.json` en werk de vertalingen bij");
  }
  for (const [code, mod] of Object.entries(LEGAL_TR)) {
    const m = mod as Record<string, string> & { __count?: number };
    const missing = stored.filter((k) => !m[k]);
    const sameAsEn = stored.filter((k) => m[k] === k && !/^(Kifid|CJIB|Geldfit)$/.test(k));
    if (m.__count === stored.length && !missing.length && sameAsEn.length === 0) passed++;
    else {
      failed++;
      fails.push(`  ✗ vertaling kennisbank ${code}: ${m.__count}/${stored.length} teksten, ${missing.length} ontbreken, ${sameAsEn.length} onvertaald`);
    }
  }
  // De rest van de app per taal: rechten, antwoordbrieven, privacy en "over" niet meer in het Engels
  const en = getDict("en");
  for (const code of BUILT_IN_ORDER.filter((c) => c !== "nl" && c !== "en")) {
    const d = getDict(code);
    const same = (["reply", "legal", "privacyPage", "aboutPage"] as const).filter(
      (k) => JSON.stringify(d[k], (_, v) => (typeof v === "function" ? String(v) : v)) === JSON.stringify(en[k], (_, v) => (typeof v === "function" ? String(v) : v)),
    );
    if (!same.length && d.legal.pageTitle !== en.legal.pageTitle && d.reply.title !== en.reply.title) passed++;
    else {
      failed++;
      fails.push(`  ✗ ${code}: nog Engels in ${same.join(", ") || "legal/reply"}`);
    }
  }
}

// ---------- Schaduw wegwerken (zoals een scanner-app) ----------
{
  const W = 400, H = 560;
  const g = new Uint8ClampedArray(W * H);
  const isText = (x: number, y: number) => y % 28 < 6 && x > 40 && x < 360 && (x >> 3) % 5 !== 0; // regels "tekst"
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const light = 0.35 + 0.65 * Math.min(1, (x / W) * 0.9 + (y / H) * 0.6); // zware schaduw linksboven
      g[y * W + x] = (isText(x, y) ? 40 : 235) * light;
    }
  removeShadows(g, W, H);
  let paperMin = 255, textMax = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = g[y * W + x];
      if (isText(x, y)) textMax = Math.max(textMax, v);
      else if (y % 28 > 9 && y % 28 < 24) paperMin = Math.min(paperMin, v); // papier, niet vlak naast tekst
    }
  if (paperMin > 200 && textMax < 110) passed++;
  else {
    failed++;
    fails.push(`  ✗ schaduw wegwerken: papier minimaal ${paperMin} (moet > 200), tekst maximaal ${textMax} (moet < 110)`);
  }
}

// ---------- Voorlezen: tekst omschrijven en opknippen ----------
{
  const eq = (name: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else {
      failed++;
      fails.push(`  ✗ voorlezen ${name}: kreeg ${JSON.stringify(got)}, verwacht ${JSON.stringify(want)}`);
    }
  };
  eq("bedrag nl", prepareForSpeech("U moet € 1.250,40 betalen.", "nl"), "U moet 1250 euro 40 betalen.");
  eq("bedrag rond", prepareForSpeech("Totaal € 165,00", "nl"), "Totaal 165 euro");
  eq("bedrag en", prepareForSpeech("Pay € 192,40.", "en"), "Pay 192 euros and 40.");
  eq("bedrag ar", prepareForSpeech("€ 50,00", "ar"), "50 يورو");
  eq("telefoon", prepareForSpeech("Bel 0800 - 8020.", "nl"), "Bel 0 8 0 0, 8 0 2 0.");
  eq("iban", prepareForSpeech("NL44 RABO 0123 4567 89", "nl"), "N L 4 4, R A B O, 0 1 2 3, 4 5 6 7, 8 9");
  eq("datum blijft", prepareForSpeech("Datum 01-02-2026.", "nl"), "Datum 01-02-2026.");
  eq("afkorting", prepareForSpeech("Betaal z.s.m., bijv. via iDEAL t/m 3 mei.", "nl"), "Betaal zo snel mogelijk, bijvoorbeeld via iDEAL tot en met 3 mei.");
  eq("bedrag ar-notatie", prepareForSpeech("يجب أن تدفع \u200f187.40 € الآن", "ar"), "يجب أن تدفع 187 يورو و 40 الآن");
  eq("bedrag fa-cijfers", prepareForSpeech("۱۸۷٫۴۰ €", "fa"), "187 یورو و 40");
  eq("webadres", prepareForSpeech("Kijk op www.cjib.nl/betalen.", "nl"), "Kijk op cjib punt nl betalen.");
  eq("e-mail blijft", prepareForSpeech("Mail info@noordpunt.nl", "nl").includes("noordpunt punt nl"), true);
  eq("haakjes kort", prepareForSpeech("Aanmaning: u heeft nog niet (alles) betaald.", "nl"), "Aanmaning: u heeft nog niet alles betaald.");
  eq("haakjes lang", prepareForSpeech("Brief van Noordpunt (namens Zorgverzekeraar Zuidhaven).", "nl"), "Brief van Noordpunt, namens Zorgverzekeraar Zuidhaven.");
  eq("emoji weg", prepareForSpeech("⚠️ Let op → nu", "nl"), "Let op nu");
  eq("afgebroken woord", letterToSpeech("Wij vragen om beta-\nling van de rekening"), ["Wij vragen om betaling van de rekening."]);
  eq("adresregels", letterToSpeech("Gemeente Voorbeeldstad\nPostbus 12"), ["Gemeente Voorbeeldstad. Postbus 12."]);
  const long = "Dit is een heel lange zin, met veel komma's, die maar doorgaat en doorgaat, zodat de stem van Chrome hem anders zou afbreken na vijftien seconden, en daarom knippen we hem netjes op bij een komma, zodat het vloeiend blijft klinken.";
  const parts = chunkText(long, "nl");
  eq("opknippen", parts.every((p) => p.length <= 170) && parts.join(" ").replace(/\s+/g, " ") === long, true);
  eq("korte zinnen samen", chunkText("Ja. Nee. Misschien.", "nl"), ["Ja. Nee. Misschien."]);
  // Stemkeuze: mooiste stem voor de taal
  const v = (name: string, lang: string) => ({ name, lang, default: false, localService: true, voiceURI: name }) as SpeechSynthesisVoice;
  const voices = [v("Xander", "nl-NL"), v("Microsoft Fenna Online (Natural) - Dutch (Netherlands)", "nl-NL"), v("Google العربية", "ar-SA"), v("eSpeak Polish", "pl")];
  eq("stem nl", pickVoice(voices, "nl")?.name, "Microsoft Fenna Online (Natural) - Dutch (Netherlands)");
  eq("stem ar", pickVoice(voices, "ar")?.lang, "ar-SA");
  eq("stem pl (alleen eenvoudig)", pickVoice(voices, "pl")?.lang, "pl");
  eq("geen stem so", pickVoice(voices, "so"), null);
}

console.log(fails.join("\n"));
console.log(`\n${passed} goed, ${failed} fout (${Math.round((passed / (passed + failed)) * 100)}%)`);
process.exit(failed ? 1 : 0);
