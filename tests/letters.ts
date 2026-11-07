// Testset: verzonnen brieven (fictieve personen en organisaties-achtige teksten) met wat de gratis uitleg moet vinden.
// Draai met: npm test
export const TODAY = "2026-11-07";

export interface Case {
  name: string;
  text: string;
  expect: Partial<{
    urgency: "rood" | "oranje" | "groen";
    type: string;
    sender: string;
    senderName: RegExp;
    pay: boolean;
    amount: string;
    iban: string;
    reference: string;
    deadline: string | null;
    estimate: boolean;
    scam: boolean;
    objection: boolean;
  }>;
}

export const CASES: Case[] = [
  {
    name: "Incasso: aanmaning met IBAN en kenmerk",
    text: `Incassobureau Noordpunt B.V.
Postbus 1234, 9700 AA Groningen Tel: 050 - 123 45 67
Datum: 2 november 2026
Dossiernummer: NP-2026-448190
Aanmaning
Namens onze opdrachtgever Zorgverzekeraar Zuidhaven vorderen wij betaling van de achterstallige premie.
Hoofdsom € 152,40
Incassokosten € 40,00
Totaal te betalen € 192,40
Wij verzoeken u het totaalbedrag uiterlijk 16 november 2026 over te maken op NL91 ABNA 0417 1643 00 t.n.v. Incassobureau Noordpunt, onder vermelding van betalingskenmerk 7002 4415 8890 1123.
Indien betaling uitblijft, zullen wij de vordering overdragen aan een gerechtsdeurwaarder.`,
    expect: { urgency: "rood", type: "aanmaning", sender: "incassobureau", senderName: /Noordpunt.*namens Zorgverzekeraar Zuidhaven/, pay: true, amount: "192,40", iban: "NL91 ABNA 0417 1643 00", reference: "7002 4415 8890 1123", deadline: "2026-11-16", scam: false },
  },
  {
    name: "Incasso: zelfde brief met tekstherkenningsfouten",
    text: `lncassobureau Noordpunt B.V.
Datum: 2 november 2026
Aanmaning
Totaal te betalen €192,40
Wij verzoeken u het totaalbedrag uiterlijk 16 november 2026 over te maken op NL91 ABNA 0417
1643 00 t.n.v. Incassobureau Noordpunt, onder vermelding van betalingskenmerk 7002 4415 8890
1123.`,
    expect: { pay: true, amount: "192,40", iban: "NL91 ABNA 0417 1643 00", reference: "7002 4415 8890 1123", deadline: "2026-11-16" },
  },
  {
    name: "Belastingdienst: voorlopige aanslag, u krijgt geld terug",
    text: `Belastingdienst
Datum: 28 oktober 2026
Voorlopige aanslag inkomstenbelasting 2027
Aanslagnummer: 1234.56.789.H.76
U krijgt € 312 terug. Wij betalen dit bedrag in maandelijkse termijnen uit op uw rekening.
U hoeft hiervoor niets te doen.
Bent u het niet eens met deze aanslag? Dan kunt u binnen zes weken na de datum van deze aanslag bezwaar maken.`,
    expect: { urgency: "groen", type: "voorlopigeAanslag", sender: "belastingdienst", pay: false, objection: true },
  },
  {
    name: "CJIB: verkeersboete met verhoging",
    text: `Centraal Justitieel Incassobureau
CJIB-nummer: 3201 4455 6677 8899
Datum: 20 oktober 2026
Aanmaning
U heeft de boete van € 110,00 niet op tijd betaald. Daarom is het bedrag verhoogd met € 55,00.
Te betalen: € 165,00
Betaal uiterlijk 3 december 2026 op NL86 INGB 0002 4455 88 o.v.v. betalingskenmerk 3201 4455 6677 8899.`,
    expect: { urgency: "rood", type: "cjib", sender: "cjib", pay: true, amount: "165,00", deadline: "2026-12-03" },
  },
  {
    name: "Gemeente: aanslag met automatische incasso",
    text: `Gemeente Voorbeeldstad
Datum: 1 november 2026
Aanslag gemeentelijke belastingen 2026
Afvalstoffenheffing € 312,00
Rioolheffing € 189,00
Totaal € 501,00
U betaalt via automatische incasso. Het bedrag wordt in 10 termijnen van uw rekening afgeschreven.`,
    expect: { urgency: "groen", sender: "gemeente", senderName: /Gemeente Voorbeeldstad/, pay: false },
  },
  {
    name: "Toeslagen: terugvordering zorgtoeslag met bezwaar",
    text: `Belastingdienst/Toeslagen
Datum: 3 november 2026
Beschikking zorgtoeslag 2025: terugvordering
U heeft te veel zorgtoeslag gekregen. U moet € 450,00 terugbetalen.
Betaal het bedrag uiterlijk 15 januari 2027 op NL86 INGB 0002 4455 88 onder vermelding van betalingskenmerk 0000 1111 2222 3333.
Kunt u niet in één keer betalen? Dan kunt u een betalingsregeling aanvragen.
Bent u het niet eens met dit besluit? Maak dan binnen zes weken bezwaar.`,
    expect: { urgency: "oranje", type: "terugvordering", sender: "toeslagen", pay: true, amount: "450,00", deadline: "2027-01-15", objection: true },
  },
  {
    name: "WOZ-beschikking (geen betaling)",
    text: `Gemeente Voorbeeldstad
Datum: 31 oktober 2026
WOZ-beschikking 2026
De WOZ-waarde van uw woning aan de Lindelaan 12 is vastgesteld op € 345.000.
Bent u het niet eens met de WOZ-waarde? Dan kunt u binnen 6 weken na de dagtekening bezwaar maken.`,
    expect: { type: "woz", pay: false, objection: true },
  },
  {
    name: "Uitnodiging aangifte inkomstenbelasting",
    text: `Belastingdienst
Datum: 1 maart 2027
Uitnodiging om aangifte inkomstenbelasting 2026 te doen
Wij vragen u om aangifte te doen. Doe dit uiterlijk 1 mei 2027. U kunt inloggen met DigiD.`,
    expect: { type: "aangifte", sender: "belastingdienst", pay: false, deadline: "2027-05-01" },
  },
  {
    name: "Nep-brief: haast, crypto en buitenlands IBAN",
    text: `Belastingdienst
Laatste waarschuwing
U heeft een openstaande belastingschuld van € 1.250,00.
Betaal binnen 24 uur op DE89 3704 0044 0532 0130 00, anders komt de politie langs voor een arrestatie.
U kunt ook betalen met bitcoin.`,
    expect: { urgency: "rood", scam: true, pay: true },
  },
  {
    name: "Dagvaarding van een deurwaarder",
    text: `Gerechtsdeurwaarderskantoor Van Dam & Partners
Datum: 30 oktober 2026
DAGVAARDING
Namens Energiebedrijf Zonnig B.V. roep ik u op om te verschijnen bij de kantonrechter van de rechtbank Midden-Nederland op 2 december 2026 om 10.00 uur.
De vordering bedraagt € 864,25.`,
    expect: { urgency: "rood", type: "dagvaarding", sender: "deurwaarder", deadline: "2026-12-02" },
  },
  {
    name: "Woningcorporatie: huurverhoging",
    text: `Woonstichting Thuis
Datum: 1 november 2026
Voorstel huurverhoging per 1 juli 2027
Uw nieuwe huurprijs wordt € 712,40 per maand. Dat is € 31,20 meer dan nu.
Bent u het niet eens? Dan kunt u bezwaar maken vóór 1 juli 2027.`,
    expect: { urgency: "oranje", type: "huurverhoging", sender: "woning", objection: true },
  },
  {
    name: "Energie: jaarafrekening, u krijgt geld terug",
    text: `Vattenfall
Jaarafrekening 2026
Datum: 4 november 2026
U heeft dit jaar minder energie gebruikt dan verwacht. U krijgt € 84,12 terug.
Wij storten het bedrag binnen 14 dagen op uw rekening.`,
    expect: { urgency: "groen", type: "jaarafrekening", sender: "energie", pay: false },
  },
  {
    name: "Zorgverzekeraar: factuur eigen risico binnen 14 dagen",
    text: `Zilveren Kruis
Factuurdatum: 3 november 2026
Factuurnummer: 88112233
Factuur eigen risico
Te betalen € 385,00
Betaal binnen 14 dagen na de factuurdatum op NL20 INGB 0001 2345 67 onder vermelding van het factuurnummer.`,
    expect: { type: "factuur", sender: "zorgverzekeraar", pay: true, amount: "385,00", deadline: "2026-11-17", estimate: true },
  },
  {
    name: "UWV: besluit, niets te doen",
    text: `UWV
Datum: 5 november 2026
Besluit over uw WW-uitkering
U krijgt vanaf 1 december 2026 een WW-uitkering. U hoeft hiervoor niets te doen. Wij betalen de uitkering elke maand uit.`,
    expect: { urgency: "groen", sender: "uwv", pay: false },
  },
];
