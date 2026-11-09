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
    route: string;
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
    expect: { route: "incasso", urgency: "rood", type: "aanmaning", sender: "incassobureau", senderName: /Noordpunt B\.V\. \(namens Zorgverzekeraar Zuidhaven\)/, pay: true, amount: "192,40", iban: "NL91 ABNA 0417 1643 00", reference: "7002 4415 8890 1123", deadline: "2026-11-16", scam: false },
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
    expect: { route: "belasting", urgency: "groen", type: "voorlopigeAanslag", sender: "belastingdienst", pay: false, objection: true },
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
    expect: { route: "cjib", urgency: "rood", type: "cjib", sender: "cjib", pay: true, amount: "165,00", deadline: "2026-12-03" },
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
    expect: { route: "overheid", urgency: "groen", sender: "gemeente", senderName: /Gemeente Voorbeeldstad/, pay: false },
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
    expect: { route: "belasting", urgency: "oranje", type: "terugvordering", sender: "toeslagen", pay: true, amount: "450,00", deadline: "2027-01-15", objection: true },
  },
  {
    name: "WOZ-beschikking (geen betaling)",
    text: `Gemeente Voorbeeldstad
Datum: 31 oktober 2026
WOZ-beschikking 2026
De WOZ-waarde van uw woning aan de Lindelaan 12 is vastgesteld op € 345.000.
Bent u het niet eens met de WOZ-waarde? Dan kunt u binnen 6 weken na de dagtekening bezwaar maken.`,
    expect: { route: "overheid", type: "woz", pay: false, objection: true },
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
    expect: { route: "incasso", urgency: "rood", type: "dagvaarding", sender: "deurwaarder", deadline: "2026-12-02" },
  },
  {
    name: "Woningcorporatie: huurverhoging",
    text: `Woonstichting Thuis
Datum: 1 november 2026
Voorstel huurverhoging per 1 juli 2027
Uw nieuwe huurprijs wordt € 712,40 per maand. Dat is € 31,20 meer dan nu.
Bent u het niet eens? Dan kunt u bezwaar maken vóór 1 juli 2027.`,
    expect: { route: "huur", urgency: "oranje", type: "huurverhoging", sender: "woning", objection: true },
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
    expect: { route: "zorgverzekeraar", type: "factuur", sender: "zorgverzekeraar", pay: true, amount: "385,00", deadline: "2026-11-17", estimate: true },
  },
  {
    name: "UWV: besluit, niets te doen",
    text: `UWV
Datum: 5 november 2026
Besluit over uw WW-uitkering
U krijgt vanaf 1 december 2026 een WW-uitkering. U hoeft hiervoor niets te doen. Wij betalen de uitkering elke maand uit.`,
    expect: { route: "overheid", urgency: "groen", sender: "uwv", pay: false },
  },
];

// Extra: leesfouten in het IBAN (O i.p.v. 0, I i.p.v. 1) moeten via het controlegetal hersteld worden.
CASES.push({
  name: "IBAN met leesfouten (O/0, I/1) wordt hersteld",
  text: `Incassobureau Noordpunt B.V.
Datum: 2 november 2026
Totaal te betalen € 192,40
Betaal uiterlijk 16 november 2026 op NL9I ABNA O4I7 1643 OO t.n.v. Incassobureau Noordpunt.`,
  expect: { pay: true, iban: "NL91 ABNA 0417 1643 00" },
});

CASES.push({
  name: "Verzekeraar wijst schadeclaim af (Kifid-route)",
  text: `Veilig Thuis Verzekeringen
Datum: 1 november 2026
Uw schademelding: afwijzing
Wij hebben uw schademelding beoordeeld. Wij vergoeden de schade niet, omdat de schade niet onder de dekking van uw polis valt.
Bent u het niet eens met onze beslissing? Dan kunt u een klacht indienen bij onze klachtenafdeling.`,
  expect: { route: "verzekeraar", pay: false },
});

// Regressie (gevonden met echte foto's): gewone tekst in hoofdletters mag geen "buitenlands IBAN" opleveren,
// en een gemeentenaam mag niet doorlopen naar de volgende regel.
CASES.push({
  name: "WOZ-brief zonder valse nep-waarschuwing",
  text: `Gemeente Voorbeeldstad
Postbus 1234, 9700 AA Groningen
Datum: 31 oktober 2026
WOZ-BESCHIKKING 2026 VOOR DE WONING AAN DE LINDELAAN 12 TE UTRECHT
De WOZ-waarde van uw woning aan de Lindelaan 12 is vastgesteld op € 345.000.
Bent u het niet eens met de WOZ-waarde? Dan kunt u binnen 6 weken na de dagtekening bezwaar maken.
VOORBEELD TESTBRIEF NIET ECHT VERZONNEN TESTBRIEF OM DE APP BRIEFHULP TE TESTEN`,
  expect: { scam: false, senderName: /^Gemeente Voorbeeldstad$/, type: "woz" },
});

// ---------- Ronde 4: tien nieuwe soorten brieven (met geldige, verzonnen rekeningnummers) ----------
CASES.push(
  {
    name: "DUO terugbetalen studieschuld",
    text: `Dienst Uitvoering Onderwijs
Postbus 50061, 9702 EB Groningen
Datum: 2 november 2026
Relatienummer: 123456789
Onderwerp: Aflossing studieschuld
Geachte heer Jansen,
Vanaf 1 januari 2027 moet u uw studieschuld terugbetalen. Uw maandbedrag is € 87,35.
Het bedrag wordt maandelijks automatisch afgeschreven van uw rekening.
Kunt u dit bedrag niet betalen? Vraag dan een draagkrachtmeting aan via Mijn DUO.
Met vriendelijke groet,
DUO`,
    expect: { sender: "duo", pay: false, urgency: "groen", route: "overheid" },
  },
  {
    name: "SVB AOW toekenning",
    text: `Sociale Verzekeringsbank
Postbus 1100, 1180 BH Amstelveen
Datum 28 oktober 2026
Besluit over uw AOW-pensioen
Geachte mevrouw Bakker,
U krijgt vanaf 14 december 2026 AOW-pensioen. U krijgt € 1.212,47 bruto per maand.
Bent u het niet eens met dit besluit? Dan kunt u binnen 6 weken bezwaar maken.
Met vriendelijke groet,
Sociale Verzekeringsbank`,
    expect: { sender: "svb", pay: false, urgency: "groen", objection: true, route: "overheid" },
  },
  {
    name: "CAK bestuursrechtelijke premie",
    text: `CAK
Postbus 84020, 2508 AA Den Haag
Datum: 30 oktober 2026
Bestuursrechtelijke premie Zvw
Geachte heer El Amrani,
Uw zorgverzekeraar heeft u bij ons aangemeld omdat u 6 maanden uw premie niet heeft betaald.
U betaalt nu een bestuursrechtelijke premie van € 189,15 per maand aan het CAK.
Wij houden dit bedrag in op uw loon of uitkering.
Neem contact op met uw zorgverzekeraar om een betalingsregeling te treffen.
Met vriendelijke groet,
CAK`,
    expect: { senderName: /^CAK$/, pay: false, route: "overheid" },
  },
  {
    name: "Gemeente parkeerbelasting naheffing",
    text: `Gemeente Amsterdam
Belastingen
Datum: 4 november 2026
Naheffingsaanslag parkeerbelasting
Aanslagnummer: 1234 5678 9012
Kenteken: AB-123-C
Op 2 november 2026 om 14:32 uur stond uw auto geparkeerd zonder geldig parkeerrecht op de Keizersgracht.
Te betalen: € 72,40 (parkeerbelasting € 6,40 en kosten € 66,00)
Betaal uiterlijk 4 december 2026 op NL04 BNGH 0285 0011 23 o.v.v. het aanslagnummer.
Bent u het niet eens? U kunt binnen 6 weken na de dagtekening bezwaar maken.
Gemeente Amsterdam`,
    expect: { sender: "gemeente", senderName: /^Gemeente Amsterdam$/, pay: true, amount: "72,40", iban: "NL04 BNGH 0285 0011 23", deadline: "2026-12-04", objection: true, route: "overheid" },
  },
  {
    name: "Woningcorporatie huurachterstand",
    text: `Woonstichting De Linden
Postbus 300, 7600 AH Almelo
Datum: 5 november 2026
Betreft: huurachterstand
Geachte heer De Boer,
Uit onze administratie blijkt dat u de huur van september en oktober nog niet heeft betaald.
Uw achterstand is € 1.486,00.
Wij verzoeken u dit bedrag binnen 14 dagen te betalen op NL30 RABO 0301 2345 67 o.v.v. huurcontractnummer 45-2231.
Kunt u niet in één keer betalen? Neem dan direct contact met ons op voor een betalingsregeling.
Betaalt u niet, dan dragen wij de vordering over aan de deurwaarder en kunnen wij ontbinding van de huurovereenkomst vorderen.
Met vriendelijke groet,
Woonstichting De Linden`,
    expect: { sender: "woning", type: "aanmaning", pay: true, amount: "1.486,00", iban: "NL30 RABO 0301 2345 67", urgency: "rood", deadline: "2026-11-19", estimate: true, route: "huur" },
  },
  {
    name: "Deurwaarder loonbeslag",
    text: `Gerechtsdeurwaarders Van Dam & Partners
Postbus 777, 3000 AT Rotterdam
Datum: 3 november 2026
Dossiernummer: VD-2026-77812
Mededeling beslag op loon
Geachte mevrouw Yilmaz,
Op 1 november 2026 hebben wij beslag gelegd op uw loon bij uw werkgever, namens Zorgverzekeraar Zuidhaven.
Uw werkgever houdt maandelijks een deel van uw loon in. U houdt de beslagvrije voet over.
Uw beslagvrije voet is berekend op € 1.402,00 per maand.
Klopt de berekening niet? Neem binnen 4 weken contact met ons op.
Totaal openstaand: € 2.318,77
Met vriendelijke groet,
Van Dam & Partners Gerechtsdeurwaarders`,
    expect: { sender: "deurwaarder", type: "beslag", senderName: /Van Dam & Partners \(namens Zorgverzekeraar Zuidhaven\)$/, urgency: "rood", deadline: "2026-12-01", estimate: true },
  },
  {
    name: "Zorgverzekeraar eigen risico",
    text: `Zilveren Kruis
Postbus 444, 2700 AK Zoetermeer
Datum: 1 november 2026
Nota eigen risico
Geachte heer Pinto,
U heeft zorg gehad die onder het eigen risico valt. Uw eigen risico is nog niet helemaal verbruikt.
Te betalen: € 210,00
Wilt u dit bedrag binnen 30 dagen betalen op NL51 INGB 0000 1234 56 o.v.v. 3000 1234 5678.
U kunt ook kiezen om in termijnen te betalen via Mijn Zilveren Kruis.
Met vriendelijke groet,
Zilveren Kruis`,
    expect: { sender: "zorgverzekeraar", pay: true, amount: "210,00", iban: "NL51 INGB 0000 1234 56", deadline: "2026-12-01", estimate: true, route: "zorgverzekeraar" },
  },
  {
    name: "Energie aanmaning met afsluiting",
    text: `Vattenfall
Postbus 41920, 1009 DC Amsterdam
Datum: 6 november 2026
Aanmaning
Klantnummer: 1001 2233 44
Geachte heer Novak,
Wij hebben uw termijnbedrag van oktober (€ 145,00) nog niet ontvangen.
Betaal dit bedrag binnen 14 dagen na dagtekening van deze brief.
Betaalt u niet op tijd, dan kunnen wij uw levering van stroom en gas afsluiten. Wij melden u dan eerst aan bij de gemeente voor schuldhulp.
IBAN: NL83 ABNA 0412 3456 78, o.v.v. uw klantnummer.
Met vriendelijke groet,
Vattenfall`,
    expect: { sender: "energie", type: "aanmaning", pay: true, amount: "145,00", iban: "NL83 ABNA 0412 3456 78", urgency: "rood", deadline: "2026-11-20", estimate: true },
  },
  {
    name: "Belastingdienst betalingsherinnering",
    text: `Belastingdienst
Datum: 7 november 2026
Herinnering
Aanslagnummer: 1234.56.789.H.66
Geachte mevrouw Jansen,
U heeft de aanslag inkomstenbelasting 2025 nog niet (helemaal) betaald.
Nog te betalen: € 534,00
Betaal dit bedrag binnen 14 dagen op NL36 INGB 0007 6543 21 met betalingskenmerk 5123 4567 8901 2345.
Als u niet op tijd betaalt, krijgt u een aanmaning en moet u meer betalen.
Met vriendelijke groet,
Belastingdienst`,
    expect: { sender: "belastingdienst", pay: true, amount: "534,00", iban: "NL36 INGB 0007 6543 21", reference: "5123 4567 8901 2345", deadline: "2026-11-21", estimate: true, route: "belasting" },
  },
  {
    name: "UWV WW-uitkering stopt",
    text: `UWV
Postbus 58285, 1040 HG Amsterdam
Datum: 6 november 2026
Uw WW-uitkering stopt
Geachte heer Visser,
Uw WW-uitkering stopt op 1 december 2026, omdat u weer werk heeft gevonden.
U hoeft niets te doen.
Bent u het niet eens met dit besluit? Maak dan binnen 6 weken bezwaar.
Met vriendelijke groet,
UWV`,
    expect: { sender: "uwv", pay: false, urgency: "groen", objection: true, route: "overheid" },
  },
);
