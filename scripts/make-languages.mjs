// Maakt lib/i18n/languages.json: elke taal die de Unicode-taaldatabase (CLDR) kent,
// met de naam in het Engels, het Nederlands en in de taal zelf, en of hij van rechts naar links gaat.
import { writeFileSync } from "node:fs";

const en = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });
const nl = new Intl.DisplayNames(["nl"], { type: "language", fallback: "none" });
const L = "abcdefghijklmnopqrstuvwxyz";
const codes = [];
for (const a of L) for (const b of L) codes.push(a + b);
for (const a of L) for (const b of L) for (const c of L) codes.push(a + b + c);

const RTL_SCRIPTS = new Set(["Arab", "Hebr", "Thaa", "Syrc", "Nkoo", "Adlm", "Rohg", "Mand", "Samr", "Mend", "Yezi"]);
const seen = new Set();
const out = [];
for (const c of codes) {
  let e;
  try {
    e = en.of(c);
  } catch {
    continue;
  }
  if (!e || e === c) continue;
  // dubbele codes (bijv. 'iw' en 'he') maar één keer
  let canonical = c;
  try {
    canonical = new Intl.Locale(c).baseName;
  } catch {}
  if (seen.has(canonical)) continue;
  seen.add(canonical);
  let n = "";
  try {
    n = new Intl.DisplayNames([c], { type: "language", fallback: "none" }).of(c) ?? "";
  } catch {}
  const d = nl.of(c) ?? "";
  let rtl = false;
  try {
    rtl = RTL_SCRIPTS.has(new Intl.Locale(c).maximize().script ?? "");
  } catch {}
  const row = { c: canonical, en: e };
  if (n && n !== e && n !== c) row.n = n.charAt(0).toLocaleUpperCase(c) + n.slice(1);
  if (d && d !== e) row.nl = d;
  if (rtl) row.rtl = 1;
  out.push(row);
}
// Talen die in Nederland veel gesproken worden maar niet (goed) in CLDR staan
const EXTRA = [
  { c: "prs", en: "Dari", n: "دری", nl: "Dari", rtl: 1 },
  { c: "rif", en: "Tarifit (Riffian)", n: "Tarifiyt", nl: "Tarifit (Riffijns)" },
  { c: "ber", en: "Berber (Tamazight)", n: "Tamaziɣt", nl: "Berbers (Tamazight)" },
  { c: "aii", en: "Assyrian Neo-Aramaic", n: "ܣܘܪܝܝܐ", nl: "Assyrisch", rtl: 1 },
];
for (const x of EXTRA) if (!seen.has(x.c) && !out.some((o) => o.en === x.en)) out.push(x);
out.sort((a, b) => a.en.localeCompare(b.en));
const unique = [...new Map(out.map((x) => [x.c, x])).values()];
out.length = 0;
out.push(...unique);
writeFileSync("lib/i18n/languages.json", JSON.stringify(out));
console.log(`${out.length} talen, ${out.filter((x) => x.n).length} met eigen naam, ${out.filter((x) => x.rtl).length} van rechts naar links`);
