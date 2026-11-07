// Veilig betalen. Briefhulp voert NOOIT zelf een betaling uit. We helpen alleen:
// 1) betaallinks/QR-codes die al op de brief staan herkennen en controleren,
// 2) de officiële website van bekende organisaties tonen,
// 3) een EPC-betaal-QR maken (Europese standaard) die sommige bank-apps kunnen scannen.
// Alles alleen als de nepbrief-controle niets vond en het IBAN geldig is.
import type { Analysis } from "../types";
import { ibanValid } from "./rules";

export type LinkStatus = "afzender" | "bank" | "onbekend";

export interface FoundLink {
  url: string;
  host: string;
  source: "tekst" | "qr";
  status: LinkStatus;
}

/** Officiële websites per soort afzender (vaste, gecontroleerde lijst). */
const OFFICIAL: Partial<Record<string, { name: string; url: string; domains: string[] }>> = {
  cjib: { name: "CJIB", url: "https://www.cjib.nl", domains: ["cjib.nl"] },
  belastingdienst: { name: "Belastingdienst", url: "https://www.belastingdienst.nl", domains: ["belastingdienst.nl"] },
  toeslagen: { name: "Dienst Toeslagen", url: "https://www.belastingdienst.nl", domains: ["belastingdienst.nl", "toeslagen.nl"] },
  duo: { name: "DUO", url: "https://duo.nl", domains: ["duo.nl"] },
  uwv: { name: "UWV", url: "https://www.uwv.nl", domains: ["uwv.nl"] },
  svb: { name: "SVB", url: "https://www.svb.nl", domains: ["svb.nl"] },
};

/** Betaaldiensten van banken (de ontvanger controleert u zelf in uw bank-app). */
const BANK_PAY_DOMAINS = ["ideal.nl", "tikkie.me", "betaalverzoek.rabobank.nl", "ing.nl", "abnamro.nl", "bunq.me", "rabobank.nl", "snsbank.nl", "asnbank.nl", "regiobank.nl", "knab.nl", "triodos.nl"];

export function officialSite(a: Analysis) {
  return OFFICIAL[a.sender.type] ?? null;
}

function hostOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const endsWith = (host: string, d: string) => host === d || host.endsWith("." + d);

/** Hoort deze link bij de afzender? */
export function linkStatus(url: string, a: Analysis): LinkStatus {
  const host = hostOf(url);
  if (!host) return "onbekend";
  const off = OFFICIAL[a.sender.type];
  if (off?.domains.some((d) => endsWith(host, d))) return "afzender";
  // Naam van de afzender in het domein (bijv. "noordpunt" in noordpunt-incasso.nl)
  const words = a.sender.name
    .toLowerCase()
    .replace(/\(.*\)/, "")
    .split(/[^a-zà-ÿ0-9]+/)
    .filter((w) => w.length >= 5 && !["incassobureau", "gemeente", "stichting", "dienst"].includes(w));
  if (a.sender.type === "gemeente") {
    const city = a.sender.name.replace(/^(gemeente|waterschap)\s+/i, "").toLowerCase().replace(/[^a-z]/g, "");
    if (city.length >= 3 && host.replace(/[^a-z]/g, "").includes(city)) return "afzender";
  }
  if (words.some((w) => host.replace(/[^a-z0-9]/g, "").includes(w))) return "afzender";
  if (BANK_PAY_DOMAINS.some((d) => endsWith(host, d))) return "bank";
  return "onbekend";
}

/** Links uit de tekst van de brief en uit QR-codes, met controle. */
export function collectLinks(text: string, qr: string[], a: Analysis): FoundLink[] {
  const out: FoundLink[] = [];
  const seen = new Set<string>();
  const push = (raw: string, source: FoundLink["source"]) => {
    const url = raw.replace(/[.,;:)]+$/, "");
    const host = hostOf(url);
    if (!host || seen.has(host)) return; // per website één keer (QR-code gaat voor)
    seen.add(host);
    out.push({ url: url.startsWith("http") ? url : `https://${url}`, host, source, status: linkStatus(url, a) });
  };
  for (const q of qr) if (/^https?:\/\//i.test(q)) push(q, "qr");
  const re = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:nl|com|eu|me|org|net)(?:\/[^\s)]*)?/gi;
  for (const m of text.matchAll(re)) {
    if (text[m.index! - 1] === "@") continue;
    // Alleen links die over betalen gaan, of een korte link van de afzender
    if (/betal|pay|ideal|qr|tikkie|machtig|regeling/i.test(m[0]) || m[0].includes("/")) push(m[0], "tekst");
  }
  return out;
}

/** Mag de app betaalhulp tonen? Alleen als er geen twijfel is. */
export function paymentSafe(a: Analysis) {
  return a.payment.needed && !a.scam_check.suspicious;
}

function amountNumber(a: Analysis): number | null {
  const s = a.payment.amount;
  if (!s) return null;
  const m = s.replace(/[^\d,.-]/g, "");
  // Nederlands (1.234,56) of Engels (1,234.56)
  const n = /,\d{2}$/.test(m) ? parseFloat(m.replace(/\./g, "").replace(",", ".")) : parseFloat(m.replace(/,/g, ""));
  return isFinite(n) && n > 0 && n < 1_000_000 ? n : null;
}

/**
 * EPC-QR (European Payments Council, "SEPA Credit Transfer" QR), versie 002.
 * Het betalingskenmerk komt in de omschrijving, zodat het altijd meegaat.
 */
export function epcPayload(a: Analysis): string | null {
  const iban = a.payment.iban?.replace(/\s/g, "");
  const name = (a.payment.to || a.sender.name.replace(/\s*\(namens .*\)$/, "")).slice(0, 70);
  const amount = amountNumber(a);
  if (!iban || !name || !ibanValid(iban)) return null;
  const ref = (a.payment.reference ?? "").replace(/\s/g, "");
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    name,
    iban,
    amount ? `EUR${amount.toFixed(2)}` : "",
    "",
    "",
    ref ? ref.slice(0, 140) : "",
    "",
  ].join("\n");
}
