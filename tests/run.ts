// Draait alle testbrieven door de gratis uitleg en laat zien wat goed en fout gaat.
import { explainLocally } from "../lib/client/rules";
import { getDict, BUILT_IN_ORDER } from "../lib/i18n";
import { CASES, TODAY } from "./letters";

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

console.log(fails.join("\n"));
console.log(`\n${passed} goed, ${failed} fout (${Math.round((passed / (passed + failed)) * 100)}%)`);
process.exit(failed ? 1 : 0);
