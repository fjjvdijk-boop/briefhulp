// Kiest bij een brief: welke route is er als u het niet eens bent, en welke rechten zijn relevant?
import type { Analysis } from "../types";
import type { ReplyKind } from "../client/reply";
import type { TopicId } from "./topics";

type T = { nl: string; en: string };

export type RouteKind = "overheid" | "belasting" | "cjib" | "incasso" | "verzekeraar" | "zorgverzekeraar" | "huur" | "bedrijf" | "geen";

export interface RouteStep {
  title: T;
  text: T;
  /** Uiterste datum (YYYY-MM-DD), als die uit te rekenen is. */
  deadline?: string | null;
  deadlineEstimated?: boolean;
  reply?: ReplyKind;
}

export interface DisagreeRoute {
  kind: RouteKind;
  intro: T;
  steps: RouteStep[];
}

const GOV = ["belastingdienst", "toeslagen", "gemeente", "uwv", "svb", "duo"];

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function routeKind(a: Analysis, typeKey = ""): RouteKind {
  const s = a.sender.type;
  if (s === "cjib" || typeKey === "cjib") return "cjib";
  if (s === "belastingdienst" || s === "toeslagen") return "belasting";
  if (GOV.includes(s)) return "overheid";
  if (s === "incassobureau" || s === "deurwaarder") return "incasso";
  if (s === "zorgverzekeraar") return "zorgverzekeraar";
  if (s === "verzekeraar" || s === "bank") return "verzekeraar";
  if (s === "woning" || typeKey === "huurverhoging") return "huur";
  if (["beschikking", "woz"].includes(typeKey)) return "overheid";
  if (["energie", "zorg", "overig", "werk", "school"].includes(s)) return a.payment.needed ? "bedrijf" : "geen";
  return "geen";
}

/** Het stappenplan als u het niet eens bent. */
export function disagreeRoute(a: Analysis, typeKey = ""): DisagreeRoute {
  const kind = routeKind(a, typeKey);
  const sixWeeks = a.letter_date ? addDays(a.letter_date, 42) : null;
  switch (kind) {
    case "overheid":
    case "belasting":
      return {
        kind,
        intro: {
          nl: "Bent u het niet eens met dit besluit van de overheid? Dit zijn de stappen.",
          en: "Do you disagree with this government decision? These are the steps.",
        },
        steps: [
          {
            title: { nl: "1. Maak bezwaar", en: "1. File an objection" },
            text: {
              nl: "Stuur een bezwaarbrief naar de organisatie die de brief stuurde. Geen tijd voor een volledige uitleg? Stuur dan op tijd een kort bezwaar en vul het later aan. Bezwaar maken is gratis.",
              en: "Send an objection letter to the organisation that sent the letter. No time for a full explanation? Send a short objection in time and add details later. Objecting is free.",
            },
            deadline: sixWeeks,
            deadlineEstimated: true,
            reply: "bezwaar",
          },
          {
            title: { nl: "2. Beslist de organisatie niet op tijd?", en: "2. Does the organisation not decide in time?" },
            text: {
              nl: "Stuur dan een ingebrekestelling. Daarna heeft zij nog 2 weken. Beslist zij dan nog niet, dan moet zij u een dwangsom betalen (maximaal € 1.442).",
              en: "Then send a notice of default. It then has 2 more weeks. If it still doesn't decide, it must pay you a penalty (at most € 1,442).",
            },
            reply: "ingebrekestelling",
          },
          {
            title: { nl: "3. Bezwaar afgewezen? Ga in beroep", en: "3. Objection rejected? Appeal" },
            text: {
              nl: "U kunt in beroep gaan bij de rechtbank, meestal binnen 6 weken na de beslissing op uw bezwaar. U betaalt dan griffierecht.",
              en: "You can appeal to the district court, usually within 6 weeks after the decision on your objection. You then pay a court fee.",
            },
            reply: "beroep",
          },
          {
            title: { nl: "Over hoe u bent behandeld?", en: "About how you were treated?" },
            text: {
              nl: "Gaat het niet om het besluit, maar om hoe u bent behandeld? Dien dan een klacht in bij de organisatie. Daarna kunt u naar de Nationale ombudsman.",
              en: "Is it not about the decision but about how you were treated? File a complaint with the organisation. After that you can go to the National Ombudsman.",
            },
            reply: "klacht",
          },
        ],
      };
    case "cjib":
      return {
        kind,
        intro: {
          nl: "Bent u het niet eens met deze boete? Bij een verkeersboete gelden deze stappen.",
          en: "Do you disagree with this fine? For a traffic fine, these are the steps.",
        },
        steps: [
          {
            title: { nl: "1. Beroep bij de officier van justitie", en: "1. Appeal to the public prosecutor" },
            text: {
              nl: "Dit kan binnen 6 weken en is gratis. Zolang uw beroep loopt, hoeft u de boete nog niet te betalen.",
              en: "This is possible within 6 weeks and is free. While your appeal runs, you don't have to pay the fine yet.",
            },
            deadline: sixWeeks,
            deadlineEstimated: true,
            reply: "cjibBeroep",
          },
          {
            title: { nl: "2. Afgewezen? Naar de kantonrechter", en: "2. Rejected? To the sub-district court" },
            text: {
              nl: "Kijk op de brief van de officier hoe lang u heeft. Meestal moet u eerst de boete als zekerheid (borg) betalen.",
              en: "Check the prosecutor's letter for the deadline. Usually you first have to pay the fine as a deposit.",
            },
          },
          {
            title: { nl: "Wel eens, maar kunt u niet betalen?", en: "You agree, but can't pay?" },
            text: { nl: "Vraag het CJIB om een betalingsregeling.", en: "Ask the CJIB for a payment plan." },
            reply: "regeling",
          },
        ],
      };
    case "incasso":
      return {
        kind,
        intro: {
          nl: "Klopt deze vordering niet, of zijn de kosten te hoog? Dit kunt u doen.",
          en: "Is this claim wrong, or are the costs too high? This is what you can do.",
        },
        steps: [
          {
            title: { nl: "1. Vraag waar het om gaat", en: "1. Ask what it is for" },
            text: {
              nl: "Vraag namens wie het bureau incasseert en een overzicht van facturen, kosten en rente. Controleer of het bureau in het register van Justis staat.",
              en: "Ask on whose behalf they collect, and for an overview of invoices, costs and interest. Check whether the agency is in the Justis register.",
            },
            reply: "specificatie",
          },
          {
            title: { nl: "2. Betwist wat niet klopt", en: "2. Dispute what is wrong" },
            text: {
              nl: "Klopt de vordering niet, is de schuld al betaald of heel oud, of heeft u geen 14-dagenbrief gehad? Betwist het schriftelijk, vóór de betaaldatum. Betaal wel het deel dat klopt.",
              en: "Is the claim wrong, already paid or very old, or did you not get a 14-day letter? Dispute it in writing before the payment date. Do pay the part that is correct.",
            },
            deadline: a.deadline.date,
            reply: "betwisting",
          },
          {
            title: { nl: "3. Komt u er niet uit?", en: "3. Can't resolve it?" },
            text: {
              nl: "Vraag gratis advies bij Het Juridisch Loket. Alleen een rechter kan u verplichten te betalen; een incassobureau kan zelf geen beslag leggen.",
              en: "Ask Het Juridisch Loket for free advice. Only a court can force you to pay; a collection agency cannot seize anything itself.",
            },
          },
        ],
      };
    case "verzekeraar":
    case "zorgverzekeraar":
      return {
        kind,
        intro: { nl: "Bent u het oneens met uw verzekeraar of bank? Dit zijn de stappen.", en: "Disagree with your insurer or bank? These are the steps." },
        steps: [
          {
            title: { nl: "1. Dien een klacht in bij het bedrijf", en: "1. Complain to the company" },
            text: {
              nl: "Leg schriftelijk uit waarom u het niet eens bent. Het bedrijf krijgt redelijke tijd om te reageren (vaak 8 weken).",
              en: "Explain in writing why you disagree. The company gets reasonable time to respond (often 8 weeks).",
            },
            reply: "klacht",
          },
          {
            title:
              kind === "zorgverzekeraar"
                ? { nl: "2. Niet opgelost? Naar de SKGZ", en: "2. Not solved? Go to the SKGZ" }
                : { nl: "2. Niet opgelost? Naar Kifid", en: "2. Not solved? Go to Kifid" },
            text:
              kind === "zorgverzekeraar"
                ? {
                    nl: "Voor klachten over uw zorgverzekering is er de Stichting Klachten en Geschillen Zorgverzekeringen (SKGZ).",
                    en: "For complaints about your health insurance there is the SKGZ.",
                  }
                : {
                    nl: "Binnen 3 maanden na het definitieve antwoord (of binnen 1 jaar na uw eerste klacht). Ga niet eerst naar de rechter.",
                    en: "Within 3 months of the final answer (or within 1 year of your first complaint). Don't go to court first.",
                  },
          },
        ],
      };
    case "huur":
      return {
        kind,
        intro: { nl: "Bent u het niet eens met uw verhuurder? Dit zijn de stappen.", en: "Disagree with your landlord? These are the steps." },
        steps: [
          {
            title: { nl: "1. Stuur een bezwaarbrief naar uw verhuurder", en: "1. Send an objection letter to your landlord" },
            text: {
              nl: "Bij een huurverhoging: vóór de datum waarop de nieuwe huur ingaat. Leg uit waarom u het niet eens bent.",
              en: "For a rent increase: before the date the new rent starts. Explain why you disagree.",
            },
            reply: "bezwaar",
          },
          {
            title: { nl: "2. Komt u er niet uit? De Huurcommissie", en: "2. Can't agree? The Rent Tribunal" },
            text: {
              nl: "De Huurcommissie kan het vaak beoordelen. Welke stappen precies gelden, hangt af van uw soort woning: kijk op huurcommissie.nl.",
              en: "The Huurcommissie can often assess it. The exact steps depend on your type of home: see huurcommissie.nl.",
            },
          },
        ],
      };
    case "bedrijf":
      return {
        kind,
        intro: { nl: "Klopt de rekening niet? Dit kunt u doen.", en: "Is the bill wrong? This is what you can do." },
        steps: [
          {
            title: { nl: "1. Dien een klacht in bij het bedrijf", en: "1. Complain to the company" },
            text: {
              nl: "Leg schriftelijk uit wat er niet klopt, vóór de betaaldatum. Betaal het deel dat wel klopt.",
              en: "Explain in writing what is wrong, before the payment date. Pay the part that is correct.",
            },
            deadline: a.deadline.date,
            reply: "klacht",
          },
          {
            title: { nl: "2. Niet opgelost?", en: "2. Not solved?" },
            text: {
              nl: "Is het bedrijf aangesloten bij De Geschillencommissie? Dan kunt u daar terecht. Of vraag gratis advies bij Het Juridisch Loket.",
              en: "Is the company a member of De Geschillencommissie? Then you can go there. Or ask Het Juridisch Loket for free advice.",
            },
          },
        ],
      };
    default:
      return {
        kind,
        intro: {
          nl: "Bent u het ergens niet mee eens? Neem contact op met de afzender, of vraag gratis advies bij Het Juridisch Loket.",
          en: "Do you disagree with something? Contact the sender, or ask Het Juridisch Loket for free advice.",
        },
        steps: [],
      };
  }
}

/** Welke onderwerpen uit de kennisbank passen bij deze brief? (belangrijkste eerst) */
export function relevantTopics(a: Analysis, typeKey = ""): TopicId[] {
  const kind = routeKind(a, typeKey);
  const out: TopicId[] = [];
  const add = (...ids: TopicId[]) => ids.forEach((id) => !out.includes(id) && out.push(id));
  if (kind === "overheid" || kind === "belasting") add("bezwaar", "beroep", "teLaat");
  if (kind === "cjib") add("cjib");
  if (kind === "incasso") add("incassokosten", "incassoregister", "verjaring");
  if (a.sender.type === "deurwaarder" || /beslag/i.test(a.letter_type)) add("beslag");
  if (a.sender.type === "toeslagen" || typeKey === "terugvordering") add("toeslagen");
  if (typeKey === "aanslag" && a.sender.type === "gemeente") add("kwijtschelding");
  if (kind === "huur") add("huur");
  if (a.sender.type === "zorgverzekeraar") add("zorgpremie");
  if (a.sender.type === "energie") add("energie");
  if (kind === "verzekeraar" || kind === "zorgverzekeraar") add("kifid");
  if (a.payment.needed) add("regeling", "schuldhulp");
  if (kind === "overheid" || kind === "belasting") add("ombudsman");
  add("rechtshulp");
  return out;
}

export function L(t: { nl: string; en: string }, lang: string) {
  return lang === "nl" ? t.nl : t.en;
}
