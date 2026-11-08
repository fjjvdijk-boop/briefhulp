// Verzamelt alle Engelse teksten van de kennisbank en de stappenplannen (sleutels voor de vertalingen).
import { TOPICS } from "../lib/legal/topics";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const NAME_KEYS = ["Het Juridisch Loket (gratis advies)", "Rekentool beslagvrije voet", "Uw gemeente of belastingkantoor", "Uw gemeente", "SKGZ (zorgverzekering)"];
export function legalKeys(): string[] {
  const out = new Set<string>();
  for (const t of TOPICS) {
    out.add(t.title.en);
    out.add(t.summary.en);
    t.points.en.forEach((p) => out.add(p));
  }
  const src = readFileSync(join(__dirname, "../lib/legal/route.ts"), "utf8");
  for (const m of src.matchAll(/\ben: "((?:[^"\\]|\\.)*)"/g)) out.add(JSON.parse(`"${m[1]}"`));
  NAME_KEYS.forEach((s) => out.add(s));
  return [...out];
}
if (process.argv[1]?.endsWith("legal-strings.ts")) console.log(JSON.stringify(legalKeys(), null, 1));
