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

/** Meer verzonnen voorbeeldbrieven (fictieve personen en bedrijven), om de app te leren kennen. */
export function sampleLetters(): { id: string; typeKey: string; emoji: string; text: string }[] {
  const d = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  };
  return [
    { id: "incasso", typeKey: "aanmaning", emoji: "💶", text: sampleLetterText() },
    {
      id: "teruggave",
      typeKey: "voorlopigeAanslag",
      emoji: "🏛️",
      text: `Belastingdienst
Datum: ${d(-3)}
Voorlopige aanslag inkomstenbelasting
Aanslagnummer: 1234.56.789.H.76
U krijgt € 312 terug. Wij betalen dit bedrag in maandelijkse termijnen uit op uw rekening.
U hoeft hiervoor niets te doen.
Bent u het niet eens met deze aanslag? Dan kunt u binnen zes weken na de datum van deze aanslag bezwaar maken.`,
    },
    {
      id: "toeslag",
      typeKey: "terugvordering",
      emoji: "🏠",
      text: `Belastingdienst/Toeslagen
Datum: ${d(-4)}
Beschikking zorgtoeslag: terugvordering
U heeft te veel zorgtoeslag gekregen. U moet € 450,00 terugbetalen.
Betaal het bedrag uiterlijk ${d(60)} op NL86 INGB 0002 4455 88 onder vermelding van betalingskenmerk 0000 1111 2222 3333.
Kunt u niet in één keer betalen? Dan kunt u een betalingsregeling aanvragen.
Bent u het niet eens met dit besluit? Maak dan binnen zes weken bezwaar.`,
    },
    {
      id: "nep",
      typeKey: "laatste",
      emoji: "⚠️",
      text: `Belastingdienst
Laatste waarschuwing
U heeft een openstaande belastingschuld van € 1.250,00.
Betaal binnen 24 uur op DE89 3704 0044 0532 0130 00, anders komt de politie langs voor een arrestatie.
U kunt ook betalen met bitcoin.`,
    },
  ];
}
