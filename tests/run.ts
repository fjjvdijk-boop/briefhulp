// Draait alle testbrieven door de gratis uitleg en laat zien wat goed en fout gaat.
import { explainLocally } from "../lib/client/rules";
import { getDict, BUILT_IN_ORDER } from "../lib/i18n";
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

console.log(fails.join("\n"));
console.log(`\n${passed} goed, ${failed} fout (${Math.round((passed / (passed + failed)) * 100)}%)`);
process.exit(failed ? 1 : 0);
