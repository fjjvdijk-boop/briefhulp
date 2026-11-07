import type { Analysis } from "./types";

// Voorbeelduitleg van een verzonnen brief (fictieve organisaties), voor de demo en voor de
// knop "Bekijk een voorbeeld". De deadline ligt altijd 9 dagen na vandaag.
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function nlDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

export function makeSample(): Analysis {
  const deadline = inDays(9);
  return {
    is_letter: true,
    readable: true,
    photo_tip: null,
    sender: { name: "Incassobureau Noordpunt (namens Zorgverzekeraar Zuidhaven)", type: "incassobureau" },
    letter_type: "Herinnering van een incassobureau: u moet nog betalen",
    headline: `U moet € 187,40 betalen, uiterlijk ${nlDate(deadline)}.`,
    summary:
      "U heeft de zorgpremie van augustus en september niet betaald. Daarom heeft uw zorgverzekeraar een incassobureau ingeschakeld. Het incassobureau vraagt nu het bedrag plus extra kosten. Betaalt u op tijd, dan komen er geen nieuwe kosten bij.",
    urgency: {
      level: "rood",
      reason: "U moet binnen 9 dagen betalen. Anders kunnen de kosten hoger worden.",
    },
    actions: [
      {
        step: "Controleer of het klopt",
        detail: "Kijk in uw bankapp of u de premie van augustus en september echt niet heeft betaald.",
      },
      {
        step: "Betaal € 187,40",
        detail: "Gebruik precies het betalingskenmerk hieronder. Dan weet het incassobureau dat het geld van u is.",
      },
      {
        step: "Kunt u niet alles in één keer betalen? Bel dan vóór de deadline",
        detail: "Vraag om een betalingsregeling. Dat mag. Bel het nummer op de brief.",
      },
      {
        step: "Bewaar de brief en het bewijs van betaling",
        detail: "Maak een schermafbeelding van de betaling in uw bankapp.",
      },
    ],
    deadline: { date: deadline, what: "Betalen of een regeling afspreken", is_estimate: false },
    amounts: [
      { amount: "€ 152,40", description: "Zorgpremie augustus en september" },
      { amount: "€ 35,00", description: "Incassokosten" },
      { amount: "€ 187,40", description: "Totaal te betalen" },
    ],
    payment: {
      needed: true,
      amount: "€ 187,40",
      iban: "NL91 ABNA 0417 1643 00",
      to: "Incassobureau Noordpunt",
      reference: "7002 4415 8890 1123",
    },
    references: [
      { label: "Dossiernummer", value: "NP-2026-448190" },
      { label: "Klantnummer zorgverzekeraar", value: "88412076" },
      { label: "BSN", value: "*****482" },
    ],
    contact: { phone: "050 - 123 45 67", website: "voorbeeld-incasso.nl", email: null },
    objection: {
      possible: true,
      deadline: null,
      how: "Denkt u dat het niet klopt? Bel of mail het incassobureau en leg uit waarom. Betaal dan nog niet.",
    },
    if_you_do_nothing:
      "Het incassobureau kan dan meer kosten rekenen of naar de rechter gaan. Daarna kan een deurwaarder komen. Dat maakt het veel duurder.",
    difficult_words: [
      { word: "Incassobureau", meaning: "Een bedrijf dat geld ophaalt voor een ander bedrijf, als u een rekening niet heeft betaald." },
      { word: "Incassokosten", meaning: "Extra kosten omdat u te laat betaalt. Die zijn bij wet aan een maximum gebonden." },
      { word: "Betalingskenmerk", meaning: "Een nummer dat u bij de betaling invult. Zo weten ze dat het geld van u is." },
      { word: "Betalingsregeling", meaning: "Een afspraak om een bedrag in kleinere delen te betalen." },
    ],
    scam_check: { suspicious: false, signals: [] },
    help: [
      {
        name: "Geldfit",
        why: "Gratis en anoniem hulp als u moeite heeft met betalen.",
        contact: "geldfit.nl",
      },
      {
        name: "Schuldhulpverlening van uw gemeente",
        why: "Gratis hulp als u meer rekeningen niet kunt betalen.",
        contact: "Via de website van uw gemeente",
      },
    ],
  };
}

export const SAMPLE_ANALYSIS: Analysis = makeSample();

/** Tekst van een verzonnen voorbeeldbrief (fictieve organisaties) voor "Bekijk een voorbeeld" in de gratis modus. */
export function sampleLetterText() {
  const d = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  };
  return `Incassobureau Noordpunt B.V.
Postbus 1234, 9700 AA Groningen Tel: 050 - 123 45 67 www.voorbeeld-incasso.nl

Mevrouw A. de Vries
Lindelaan 12
3512 AB Utrecht

Datum: ${d(-5)}
Dossiernummer: NP-2026-448190
Uw BSN: *****482

Aanmaning

Geachte mevrouw De Vries,

Namens onze opdrachtgever Zorgverzekeraar Zuidhaven vorderen wij betaling van de achterstallige premie. Ondanks eerdere herinneringen hebben wij nog geen betaling ontvangen.

Hoofdsom € 152,40
Incassokosten € 35,00
Totaal te betalen € 187,40

Wij verzoeken u het totaalbedrag uiterlijk ${d(9)} over te maken op NL91 ABNA 0417 1643 00 t.n.v. Incassobureau Noordpunt, onder vermelding van betalingskenmerk 7002 4415 8890 1123.

Kunt u niet in één keer betalen? Neem dan contact met ons op voor een betalingsregeling. Indien betaling uitblijft, zullen wij de vordering overdragen aan een gerechtsdeurwaarder.

Met vriendelijke groet,
Incassobureau Noordpunt`;
}
