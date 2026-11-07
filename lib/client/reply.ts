// Antwoordbrieven: kant-en-klare brieven in het Nederlands (de organisatie is Nederlands),
// ingevuld met de gegevens uit de uitleg. De gebruiker vult alleen naam en adres in.
import type { Analysis } from "../types";

export type ReplyKind = "regeling" | "uitstel" | "bezwaar" | "specificatie";

export interface ReplyInput {
  name: string;
  address: string; // straat + huisnummer
  postcode: string; // postcode + plaats
  phone: string;
  monthly: string; // voorgesteld bedrag per maand (betalingsregeling)
  reason: string; // eigen toelichting (optioneel)
}

export function availableReplies(a: Analysis): ReplyKind[] {
  const out: ReplyKind[] = [];
  if (a.payment.needed) out.push("regeling", "uitstel");
  if (a.objection.possible) out.push("bezwaar");
  if (a.payment.needed && ["incassobureau", "deurwaarder"].includes(a.sender.type)) out.push("specificatie");
  return out;
}

function nlDate(iso?: string | null) {
  const d = iso ? new Date(iso + "T12:00:00") : new Date();
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function refLines(a: Analysis) {
  const refs = [
    ...a.references.filter((r) => !/bsn/i.test(r.label)).map((r) => `${r.label}: ${r.value}`),
    a.payment.reference ? `Betalingskenmerk: ${a.payment.reference}` : null,
  ].filter(Boolean) as string[];
  return refs.length ? refs : ["Kenmerk: [vul het kenmerk van de brief in]"];
}

const SUBJECT: Record<ReplyKind, string> = {
  regeling: "Verzoek om een betalingsregeling",
  uitstel: "Verzoek om uitstel van betaling",
  bezwaar: "Bezwaar",
  specificatie: "Verzoek om specificatie van de vordering",
};

export function replySubject(kind: ReplyKind, a: Analysis) {
  return `${SUBJECT[kind]} – ${refLines(a)[0]}`;
}

/** Maakt de volledige brief als platte tekst. */
export function buildReply(kind: ReplyKind, a: Analysis, input: ReplyInput, letterDate?: string | null): string {
  const me = [input.name || "[uw naam]", input.address || "[straat en huisnummer]", input.postcode || "[postcode en woonplaats]"];
  if (input.phone) me.push(`Telefoon: ${input.phone}`);
  const sender = a.sender.name.replace(/\s*\(namens .*\)$/, "");
  const amount = a.payment.amount ?? "[bedrag]";
  const brief = letterDate ? `uw brief van ${nlDate(letterDate)}` : "uw brief";
  const reason = input.reason.trim();

  let body: string[];
  switch (kind) {
    case "regeling":
      body = [
        `Ik heb ${brief} ontvangen. Daarin vraagt u mij ${amount} te betalen.`,
        `Ik kan dit bedrag niet in één keer betalen. Daarom vraag ik u om een betalingsregeling.`,
        input.monthly
          ? `Ik stel voor om elke maand € ${input.monthly.replace(/^€\s*/, "")} te betalen, totdat het bedrag is betaald.`
          : `Ik stel voor om het bedrag in maandelijkse termijnen te betalen. Graag hoor ik welk bedrag per maand voor u mogelijk is.`,
        reason ? `Toelichting: ${reason}` : "",
        `Wilt u mij schriftelijk laten weten of u akkoord gaat? Ik vraag u om in de tussentijd geen extra kosten te rekenen en geen verdere stappen te zetten.`,
      ];
      break;
    case "uitstel":
      body = [
        `Ik heb ${brief} ontvangen. Daarin vraagt u mij ${amount} te betalen${a.deadline.date ? ` vóór ${nlDate(a.deadline.date)}` : ""}.`,
        `Ik vraag u om uitstel van betaling. Ik kan het bedrag nu niet op tijd betalen.`,
        reason ? `Toelichting: ${reason}` : "",
        `Ik stel voor om het bedrag uiterlijk [datum] te betalen.`,
        `Wilt u mij schriftelijk laten weten of u akkoord gaat? Ik vraag u om in de tussentijd geen extra kosten te rekenen.`,
      ];
      break;
    case "bezwaar":
      body = [
        `Hierbij maak ik bezwaar tegen het besluit in ${brief}.`,
        reason
          ? `Ik ben het niet eens met dit besluit, omdat: ${reason}`
          : `Ik ben het niet eens met dit besluit. De redenen (gronden) van mijn bezwaar stuur ik u zo snel mogelijk na. Wilt u mij daarvoor een redelijke termijn geven?`,
        `Ik verzoek u om mijn bezwaar te bevestigen en het besluit te herzien.`,
        `Wilt u ook de stukken sturen waarop het besluit is gebaseerd?`,
      ];
      break;
    case "specificatie":
      body = [
        `Ik heb ${brief} ontvangen. Daarin vraagt u mij ${amount} te betalen.`,
        `Voordat ik betaal, vraag ik u om een duidelijke specificatie van de vordering. Wilt u mij laten weten:`,
        `- namens wie u deze vordering int;\n- waar de vordering precies voor is (facturen, data en bedragen);\n- hoe de incassokosten en eventuele rente zijn berekend.`,
        reason ? `Toelichting: ${reason}` : "",
        `Ik vraag u om de invordering op te schorten totdat ik deze informatie heb ontvangen.`,
      ];
      break;
  }

  return [
    ...me,
    "",
    sender,
    "",
    `${nlDate(null)}`,
    "",
    `Onderwerp: ${SUBJECT[kind]}`,
    ...refLines(a),
    "",
    "Geachte heer, mevrouw,",
    "",
    body.filter(Boolean).join("\n\n"),
    "",
    "Met vriendelijke groet,",
    "",
    "",
    input.name || "[uw naam]",
    "[handtekening]",
  ].join("\n");
}

const STORE = "briefhulp:reply-me";
export function loadMe(): Partial<ReplyInput> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
export function saveMe(input: ReplyInput, remember: boolean) {
  try {
    if (remember)
      localStorage.setItem(STORE, JSON.stringify({ name: input.name, address: input.address, postcode: input.postcode, phone: input.phone }));
    else localStorage.removeItem(STORE);
  } catch {
    /* niets */
  }
}
