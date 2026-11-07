// Antwoordbrieven: kant-en-klare brieven in het Nederlands (de organisatie is Nederlands),
// ingevuld met de gegevens uit de uitleg. De gebruiker vult alleen naam en adres in.
import type { Analysis } from "../types";
import { disagreeRoute } from "../legal/route";

export type ReplyKind =
  | "regeling"
  | "uitstel"
  | "bezwaar"
  | "specificatie"
  | "beroep"
  | "cjibBeroep"
  | "betwisting"
  | "ingebrekestelling"
  | "klacht"
  | "inzage"
  | "kwijtschelding";

export interface ReplyInput {
  name: string;
  address: string; // straat + huisnummer
  postcode: string; // postcode + plaats
  phone: string;
  monthly: string; // voorgesteld bedrag per maand (betalingsregeling)
  reason: string; // eigen toelichting (optioneel)
}

/** Brieven voor betalen (regeling, uitstel, kwijtschelding). */
export function paymentReplies(a: Analysis, typeKey = ""): ReplyKind[] {
  if (!a.payment.needed) return [];
  const out: ReplyKind[] = ["regeling", "uitstel"];
  if (a.sender.type === "gemeente" && /aanslag/i.test(typeKey + a.letter_type)) out.push("kwijtschelding");
  return out;
}

/** Brieven als u het niet eens bent (volgens de route), plus gegevens opvragen. */
export function disagreeReplies(a: Analysis, typeKey = ""): ReplyKind[] {
  const out: ReplyKind[] = [];
  for (const st of disagreeRoute(a, typeKey).steps) if (st.reply && !out.includes(st.reply) && st.reply !== "regeling") out.push(st.reply);
  if (a.objection.possible && !out.includes("bezwaar") && !out.includes("cjibBeroep")) out.unshift("bezwaar");
  out.push("inzage");
  return out;
}

export function availableReplies(a: Analysis, typeKey = ""): ReplyKind[] {
  return [...paymentReplies(a, typeKey), ...disagreeReplies(a, typeKey)];
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
  beroep: "Beroepschrift",
  cjibBeroep: "Beroep tegen verkeersboete (Mulderbeschikking)",
  betwisting: "Betwisting van de vordering",
  ingebrekestelling: "Ingebrekestelling wegens niet tijdig beslissen",
  klacht: "Klacht",
  inzage: "Verzoek om inzage in mijn persoonsgegevens (artikel 15 AVG)",
  kwijtschelding: "Verzoek om kwijtschelding",
};

/** Aan wie de brief gaat (als dat niet de afzender is). */
function recipient(kind: ReplyKind, sender: string) {
  if (kind === "beroep") return "Rechtbank [naam rechtbank, zie de beslissing op bezwaar]\nSector bestuursrecht";
  if (kind === "cjibBeroep") return "Officier van justitie\n[adres zoals vermeld op de beschikking of op om.nl]";
  return sender;
}

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
    case "beroep":
      body = [
        `Hierbij ga ik in beroep tegen de beslissing op mijn bezwaar van [datum beslissing op bezwaar], genomen door ${sender}.`,
        `Kenmerk van de beslissing: [kenmerk]. Een kopie van de beslissing stuur ik mee.`,
        reason
          ? `Ik ben het niet eens met deze beslissing, omdat: ${reason}`
          : `De gronden van mijn beroep stuur ik zo snel mogelijk na. Ik verzoek u mij daarvoor een termijn te geven.`,
        `Ik verzoek de rechtbank het beroep gegrond te verklaren en de beslissing te vernietigen.`,
      ];
      break;
    case "cjibBeroep":
      body = [
        `Hierbij ga ik in beroep tegen de beschikking${a.payment.reference ? ` met kenmerk ${a.payment.reference}` : ""}${letterDate ? ` van ${nlDate(letterDate)}` : ""}, voor de gedraging op [datum] met kenteken [kenteken].`,
        reason ? `Ik ben het niet eens met deze beschikking, omdat: ${reason}` : `Ik ben het niet eens met deze beschikking, omdat: [leg uit waarom, bijvoorbeeld: ik reed daar niet / het bord was niet zichtbaar].`,
        `Ik verzoek u de beschikking te vernietigen. Een kopie van de beschikking stuur ik mee.`,
      ];
      break;
    case "betwisting":
      body = [
        `Ik heb ${brief} ontvangen. Daarin vraagt u mij ${amount} te betalen.`,
        `Ik betwist deze vordering${reason ? `, omdat: ${reason}` : ", omdat: [leg uit waarom, bijvoorbeeld: ik heb al betaald / ik heb dit niet besteld / ik heb geen 14-dagenbrief ontvangen / de incassokosten zijn te hoog]"}.`,
        `Ik verzoek u de invordering op te schorten en mij te laten weten namens wie u incasseert, en een specificatie te sturen van hoofdsom, kosten en rente.`,
        `Ik verzoek u ook om uw inschrijving in het Register Incassodienstverlening te vermelden.`,
      ];
      break;
    case "ingebrekestelling":
      body = [
        `Op [datum aanvraag of bezwaar] heb ik een [aanvraag / bezwaarschrift] bij u ingediend over [onderwerp].`,
        `De termijn waarbinnen u moest beslissen is verstreken. Hierbij stel ik u in gebreke.`,
        `Ik verzoek u binnen twee weken na ontvangst van deze brief alsnog te beslissen. Doet u dat niet, dan bent u een dwangsom verschuldigd volgens de Algemene wet bestuursrecht.`,
      ];
      break;
    case "klacht":
      body = [
        `Ik dien hierbij een klacht in over ${brief}${reason ? "" : " en de manier waarop mijn zaak is behandeld"}.`,
        reason ? `Mijn klacht: ${reason}` : `Mijn klacht: [beschrijf wat er gebeurd is, wanneer, en met wie u contact had].`,
        `Ik verzoek u mijn klacht te behandelen en mij schriftelijk te laten weten wat u ermee doet.`,
      ];
      break;
    case "inzage":
      body = [
        `Op grond van artikel 15 van de Algemene verordening gegevensbescherming (AVG) vraag ik u om inzage in alle persoonsgegevens die u van mij verwerkt.`,
        `Wilt u mij laten weten: welke gegevens u heeft, waarvoor u ze gebruikt, van wie u ze heeft gekregen, aan wie u ze heeft gegeven en hoe lang u ze bewaart?`,
        `U moet binnen een maand na ontvangst van dit verzoek reageren. Een kopie van mijn identiteitsbewijs stuur ik alleen mee als u daarom vraagt.`,
      ];
      break;
    case "kwijtschelding":
      body = [
        `Ik heb ${brief} ontvangen met een aanslag van ${amount}.`,
        `Ik heb een laag inkomen en weinig of geen vermogen. Daarom vraag ik u om kwijtschelding van deze aanslag.`,
        reason ? `Toelichting: ${reason}` : "",
        `Wilt u mij het aanvraagformulier sturen als dat nodig is? Ik vraag u om de invordering op te schorten zolang mijn verzoek in behandeling is.`,
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
    recipient(kind, sender),
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
