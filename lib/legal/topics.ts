// Kennisbank "Uw rechten". Gecontroleerd op officiële en betrouwbare bronnen op 7 november 2026.
// Regel: alleen wat zeker is. Bedragen die elk jaar veranderen staan er NIET in als vast feit:
// dan verwijzen we naar de officiële pagina of rekentool. Laat deze teksten nakijken door een jurist.

export const CHECKED = "2026-11-07";

export type TopicId =
  | "bezwaar"
  | "beroep"
  | "teLaat"
  | "incassokosten"
  | "incassoregister"
  | "verjaring"
  | "cjib"
  | "regeling"
  | "beslag"
  | "schuldhulp"
  | "toeslagen"
  | "kwijtschelding"
  | "huur"
  | "zorgpremie"
  | "energie"
  | "kifid"
  | "ombudsman"
  | "rechtshulp"
  | "inzage";

type T = { nl: string; en: string };
type TL = { nl: string[]; en: string[] };

export interface Topic {
  id: TopicId;
  group: "oneens" | "betalen" | "schulden" | "wonen" | "klagen" | "hulp";
  title: T;
  summary: T;
  points: TL;
  where: { name: string; contact?: string; url?: string }[];
  sources: { label: string; url: string }[];
}

const JL = { name: "Het Juridisch Loket (gratis advies)", contact: "0800 - 8020", url: "https://www.juridischloket.nl" };

export const TOPICS: Topic[] = [
  {
    id: "bezwaar",
    group: "oneens",
    title: { nl: "Bezwaar maken tegen een besluit van de overheid", en: "Objecting to a government decision" },
    summary: {
      nl: "Bent u het niet eens met een besluit van de overheid (bijvoorbeeld een aanslag, toeslag of uitkering)? Dan maakt u eerst bezwaar bij de organisatie die het besluit nam.",
      en: "Do you disagree with a government decision (for example a tax assessment, allowance or benefit)? First you object to the organisation that made the decision.",
    },
    points: {
      nl: [
        "U heeft meestal 6 weken. Die tellen vanaf de datum op de brief.",
        "Te weinig tijd om alles uit te leggen? Stuur dan op tijd een kort bezwaar ('pro forma'). De uitleg stuurt u later na.",
        "Bezwaar maken is gratis.",
        "De organisatie beslist meestal binnen 6 weken (soms 12 weken). Ze mag dat één keer met 6 weken verlengen.",
        "U moet meestal wel gewoon betalen tijdens het bezwaar. Vraag zo nodig om uitstel.",
      ],
      en: [
        "You usually have 6 weeks, counted from the date on the letter.",
        "Not enough time to explain everything? Send a short objection in time ('pro forma') and add your reasons later.",
        "Objecting is free.",
        "The organisation usually decides within 6 weeks (sometimes 12) and may extend this once by 6 weeks.",
        "You usually still have to pay during the objection. Ask for a delay if needed.",
      ],
    },
    where: [JL],
    sources: [
      { label: "Rijksoverheid – bezwaar en beroep", url: "https://www.rijksoverheid.nl/onderwerpen/bezwaar-en-beroep" },
      { label: "Ondernemersplein – bezwaar en beroep", url: "https://ondernemersplein.overheid.nl/wetten-en-regels/bezwaar-en-beroep-tegen-beslissing-van-de-overheid/" },
    ],
  },
  {
    id: "beroep",
    group: "oneens",
    title: { nl: "In beroep gaan bij de rechter", en: "Appealing to the court" },
    summary: {
      nl: "Is uw bezwaar afgewezen? Dan kunt u in beroep gaan bij de rechtbank. Daarna is soms nog hoger beroep mogelijk.",
      en: "Was your objection rejected? Then you can appeal to the district court. After that, a further appeal is sometimes possible.",
    },
    points: {
      nl: [
        "U heeft meestal 6 weken na de beslissing op uw bezwaar.",
        "U stuurt een beroepschrift naar de rechtbank. Ook hier kan eerst een kort (pro forma) beroep.",
        "U betaalt griffierecht. Het bedrag verandert elk jaar: kijk op rechtspraak.nl.",
        "Een advocaat is niet verplicht. Weinig inkomen? Dan betaalt de overheid vaak mee aan een advocaat (toevoeging).",
      ],
      en: [
        "You usually have 6 weeks after the decision on your objection.",
        "You send a notice of appeal to the court. A short (pro forma) appeal is possible here too.",
        "You pay a court fee. The amount changes every year: see rechtspraak.nl.",
        "A lawyer is not required. Low income? The government often helps pay for a lawyer.",
      ],
    },
    where: [JL],
    sources: [{ label: "Rechtspraak – bestuursrecht", url: "https://www.rechtspraak.nl" }],
  },
  {
    id: "teLaat",
    group: "oneens",
    title: { nl: "De overheid beslist niet op tijd", en: "The government does not decide on time" },
    summary: {
      nl: "Is de termijn voor een besluit voorbij? Dan kunt u de organisatie een brief sturen: een 'ingebrekestelling'. Daarna heeft zij nog 2 weken.",
      en: "Has the deadline for a decision passed? You can send the organisation a 'notice of default'. After that it has 2 more weeks.",
    },
    points: {
      nl: [
        "Beslist de organisatie ook dan niet? Dan moet zij u per dag een dwangsom betalen: in totaal maximaal € 1.442 (42 dagen).",
        "U kunt dan ook meteen naar de rechter, zonder eerst bezwaar te maken.",
        "Let op: dit geldt niet bij een voorlopige toeslag. De Belastingdienst heeft eigen regels.",
      ],
      en: [
        "If it still does not decide, it must pay you a penalty per day: at most € 1,442 in total (42 days).",
        "You can then also go straight to the court, without objecting first.",
        "Note: this does not apply to a provisional allowance. The Tax Administration has its own rules.",
      ],
    },
    where: [JL],
    sources: [
      { label: "Rijksoverheid – dwangsom bij niet tijdig beslissen", url: "https://www.rijksoverheid.nl/wetten-en-regelingen/productbeschrijvingen/dwangsom-bij-niet-tijdig-beslissen-overheid" },
      { label: "Rechtspraak – overheid beslist niet op tijd", url: "https://www.rechtspraak.nl/onderwerpen/overheidsorganisatie-beslist-niet-op-tijd/procedure" },
    ],
  },
  {
    id: "incassokosten",
    group: "betalen",
    title: { nl: "Incassokosten: wat mag wel en niet?", en: "Collection costs: what is allowed?" },
    summary: {
      nl: "Voor consumenten zijn incassokosten aan regels gebonden. Eerst moet u een '14-dagenbrief' krijgen.",
      en: "For consumers, collection costs are regulated. First you must receive a '14-day letter'.",
    },
    points: {
      nl: [
        "Eerst moet u een herinnering krijgen waarin staat dat u nog 14 dagen heeft om te betalen zonder extra kosten.",
        "Pas daarna mogen er incassokosten bij. Over de eerste € 2.500 is dat maximaal 15%, met een minimum van € 40.",
        "Hogere kosten of geen 14-dagenbrief gehad? Betwist de kosten schriftelijk.",
        "Betaal het deel waar u het wél mee eens bent, dan lopen de kosten daar niet verder op.",
      ],
      en: [
        "First you must get a reminder saying you have 14 more days to pay without extra costs.",
        "Only after that may collection costs be added: at most 15% of the first € 2,500, with a minimum of € 40.",
        "Higher costs, or no 14-day letter? Dispute the costs in writing.",
        "Pay the part you do agree with, so costs do not grow on that part.",
      ],
    },
    where: [JL, { name: "Geldfit", url: "https://www.geldfit.nl" }],
    sources: [{ label: "Wet normering buitengerechtelijke incassokosten (wetten.overheid.nl)", url: "https://wetten.overheid.nl" }],
  },
  {
    id: "incassoregister",
    group: "betalen",
    title: { nl: "Is het incassobureau wel echt en geregistreerd?", en: "Is the collection agency real and registered?" },
    summary: {
      nl: "Incassobureaus moeten in Nederland ingeschreven staan in een openbaar register (Wet kwaliteit incassodienstverlening). Dat register wordt beheerd door Justis.",
      en: "Debt collection agencies in the Netherlands must be listed in a public register, managed by Justis.",
    },
    points: {
      nl: [
        "Zoek het bureau op in het register voordat u betaalt.",
        "Staat het er niet in, of doet het iets wat niet mag? Meld het bij de Inspectie Justitie en Veiligheid en vraag advies bij Het Juridisch Loket.",
        "Vraag altijd: namens wie incasseert u, en waarvoor precies?",
      ],
      en: [
        "Look up the agency in the register before you pay.",
        "Not listed, or doing something not allowed? Report it to the Justice and Security Inspectorate and ask Het Juridisch Loket for advice.",
        "Always ask: on whose behalf are you collecting, and for what exactly?",
      ],
    },
    where: [JL],
    sources: [
      { label: "Justis – incassodienstverlening", url: "https://www.justis.nl/producten/screening-incassodienstverlening" },
      { label: "Rijksoverheid – regels incassodienstverlening", url: "https://www.rijksoverheid.nl/actueel/nieuws/2024/02/09/per-1-april-regels-voor-incassodienstverlening" },
    ],
  },
  {
    id: "verjaring",
    group: "betalen",
    title: { nl: "Verjaring: een oude schuld", en: "Limitation: an old debt" },
    summary: {
      nl: "Een schuld kan na een tijd 'verjaren'. Dan hoeft u niet meer te betalen, als u daar zelf een beroep op doet.",
      en: "A debt can become time-barred. Then you no longer have to pay, if you invoke this yourself.",
    },
    points: {
      nl: [
        "Voor veel rekeningen van winkels en bedrijven aan consumenten (koop) is dat 2 jaar. Voor veel andere schulden 5 jaar.",
        "De termijn begint opnieuw als de schuldeiser u (goed) aanmaant of als u de schuld erkent.",
        "Twijfelt u? Vraag het Juridisch Loket voordat u betaalt of iets toegeeft.",
      ],
      en: [
        "For many consumer purchase bills this is 2 years; for many other debts 5 years.",
        "The period restarts if the creditor properly reminds you, or if you acknowledge the debt.",
        "Not sure? Ask Het Juridisch Loket before you pay or admit anything.",
      ],
    },
    where: [JL],
    sources: [{ label: "Burgerlijk Wetboek (wetten.overheid.nl)", url: "https://wetten.overheid.nl" }],
  },
  {
    id: "cjib",
    group: "oneens",
    title: { nl: "Verkeersboete (CJIB): het niet eens", en: "Traffic fine (CJIB): if you disagree" },
    summary: {
      nl: "Bij een verkeersboete (Mulderbeschikking) gaat u eerst in beroep bij de officier van justitie. Daarna kan het naar de kantonrechter.",
      en: "For a traffic fine you first appeal to the public prosecutor. After that it can go to the sub-district court.",
    },
    points: {
      nl: [
        "Stap 1: beroep bij de officier van justitie binnen 6 weken. Dit is gratis. Zolang dit loopt, hoeft u de boete nog niet te betalen.",
        "Stap 2: afgewezen? Dan kunt u naar de kantonrechter. Kijk op de brief van de officier hoe lang u heeft.",
        "Voor de kantonrechter moet u meestal eerst de boete als zekerheid (borg) betalen.",
        "Wel eens, maar kunt u niet betalen? Vraag het CJIB om een betalingsregeling.",
      ],
      en: [
        "Step 1: appeal to the public prosecutor within 6 weeks. This is free, and you do not have to pay the fine while it runs.",
        "Step 2: rejected? Then you can go to the sub-district court. Check the prosecutor's letter for the deadline.",
        "For the court you usually first have to pay the fine as a deposit.",
        "Agree but cannot pay? Ask the CJIB for a payment plan.",
      ],
    },
    where: [{ name: "CJIB", url: "https://www.cjib.nl" }, JL],
    sources: [
      { label: "Rechtspraak – beroepsprocedure verkeersboetes", url: "https://www.rechtspraak.nl/onderwerpen/verkeersovertredingen/beroepsprocedure-verkeersboetes" },
      { label: "OM – veelgestelde vragen verkeersboete", url: "https://www.om.nl/onderwerpen/v/verkeersboete/veelgestelde-vragen-verkeersboete" },
    ],
  },
  {
    id: "regeling",
    group: "betalen",
    title: { nl: "Een betalingsregeling of uitstel vragen", en: "Asking for a payment plan or more time" },
    summary: {
      nl: "Kunt u niet alles in één keer betalen? Vraag dan zo vroeg mogelijk om een betalingsregeling of uitstel. Dat mag altijd.",
      en: "Can't pay everything at once? Ask for a payment plan or more time as early as possible. You are always allowed to ask.",
    },
    points: {
      nl: [
        "Vraag het schriftelijk en bewaar een kopie. Briefhulp kan de brief voor u maken.",
        "Noem een bedrag per maand dat u echt kunt betalen.",
        "Betaal wat u kunt, ook als de regeling nog niet rond is.",
        "Overheid (Belastingdienst, Toeslagen, CJIB, gemeente) heeft eigen regels en formulieren: kijk op hun website.",
      ],
      en: [
        "Ask in writing and keep a copy. Briefhulp can write the letter for you.",
        "Propose an amount per month you can really pay.",
        "Pay what you can, even if the plan is not agreed yet.",
        "Government bodies have their own rules and forms: check their website.",
      ],
    },
    where: [{ name: "Geldfit", url: "https://www.geldfit.nl" }, JL],
    sources: [{ label: "Geldfit", url: "https://www.geldfit.nl" }],
  },
  {
    id: "beslag",
    group: "schulden",
    title: { nl: "Beslag en de beslagvrije voet", en: "Seizure and the protected income" },
    summary: {
      nl: "Ook bij beslag op loon of uitkering mag u altijd een deel houden om van te leven: de beslagvrije voet.",
      en: "Even if your wages or benefits are seized, you may always keep a part to live on: the 'beslagvrije voet'.",
    },
    points: {
      nl: [
        "De deurwaarder of schuldeiser rekent dit bedrag uit en stuurt u een overzicht.",
        "Controleer het met de officiële rekentool. Klopt het niet? Laat het aanpassen.",
        "Is uw situatie veranderd (inkomen, huur, gezin)? Geef het meteen door.",
      ],
      en: [
        "The bailiff or creditor calculates this amount and sends you an overview.",
        "Check it with the official calculator. Wrong? Have it corrected.",
        "Has your situation changed (income, rent, family)? Report it right away.",
      ],
    },
    where: [{ name: "Rekentool beslagvrije voet", url: "https://www.uwbeslagvrijevoet.nl" }, JL],
    sources: [{ label: "Rijksoverheid – beslagvrije voet controleren", url: "https://www.rijksoverheid.nl/vraag-en-antwoord/schulden/beslagvrijevoet-controleren" }],
  },
  {
    id: "schuldhulp",
    group: "schulden",
    title: { nl: "Hulp bij schulden", en: "Help with debts" },
    summary: {
      nl: "Heeft u meerdere rekeningen die u niet kunt betalen? Uw gemeente moet u gratis helpen met schuldhulpverlening.",
      en: "Several bills you cannot pay? Your municipality must help you for free with debt support.",
    },
    points: {
      nl: [
        "Neem contact op met uw gemeente. Hoe eerder, hoe beter.",
        "Lukt het echt niet meer, dan is soms een wettelijke schuldregeling (Wsnp) mogelijk.",
        "Anoniem eerst iets vragen? Dat kan bij Geldfit.",
      ],
      en: [
        "Contact your municipality. The sooner, the better.",
        "If nothing works, a legal debt arrangement (Wsnp) is sometimes possible.",
        "Want to ask something anonymously first? Try Geldfit.",
      ],
    },
    where: [{ name: "Geldfit", url: "https://www.geldfit.nl" }, { name: "Uw gemeente", contact: "Website van uw gemeente" }],
    sources: [{ label: "Rijksoverheid – schulden", url: "https://www.rijksoverheid.nl/onderwerpen/schulden" }],
  },
  {
    id: "toeslagen",
    group: "betalen",
    title: { nl: "Toeslag terugbetalen", en: "Paying back an allowance" },
    summary: {
      nl: "Moet u toeslag terugbetalen? Dan kunt u vaak in delen betalen. Bent u het niet eens met de berekening, maak dan bezwaar.",
      en: "Do you have to pay back an allowance? You can often pay in instalments. Disagree with the calculation? Object.",
    },
    points: {
      nl: [
        "Controleer of uw inkomen en situatie goed zijn doorgegeven. Een fout? Geef het door en maak bezwaar binnen 6 weken.",
        "Vraag een betalingsregeling aan via Dienst Toeslagen.",
        "Twijfelt u? Bel de BelastingTelefoon: 0800 - 0543.",
      ],
      en: [
        "Check whether your income and situation were reported correctly. A mistake? Correct it and object within 6 weeks.",
        "Request a payment plan through the Benefits Service (Dienst Toeslagen).",
        "Not sure? Call the BelastingTelefoon: 0800 - 0543.",
      ],
    },
    where: [{ name: "BelastingTelefoon", contact: "0800 - 0543", url: "https://www.belastingdienst.nl" }],
    sources: [{ label: "Belastingdienst – toeslagen", url: "https://www.belastingdienst.nl" }],
  },
  {
    id: "kwijtschelding",
    group: "betalen",
    title: { nl: "Kwijtschelding van gemeentelijke belastingen", en: "Remission of municipal taxes" },
    summary: {
      nl: "Heeft u een laag inkomen en weinig spaargeld? Dan hoeft u soms (een deel van) gemeentelijke belastingen of waterschapsbelasting niet te betalen.",
      en: "Low income and few savings? Then you sometimes don't have to pay (part of) municipal or water board taxes.",
    },
    points: {
      nl: [
        "U moet het zelf aanvragen bij uw gemeente of het belastingkantoor dat de aanslag stuurde.",
        "Vraag het snel aan na de aanslag: er geldt vaak een termijn. Die staat op de aanslag of de website.",
        "In sommige gemeenten krijgt u het automatisch. Lukt kwijtschelding niet? Vraag dan om een betalingsregeling.",
      ],
      en: [
        "You must apply yourself to your municipality or the tax office that sent the assessment.",
        "Apply soon after the assessment: there is often a deadline, shown on the assessment or website.",
        "Some municipalities grant it automatically. Not eligible? Ask for a payment plan.",
      ],
    },
    where: [{ name: "Uw gemeente of belastingkantoor", contact: "Zie de aanslag" }],
    sources: [{ label: "Rijksoverheid – kwijtschelding gemeentelijke belastingen", url: "https://www.rijksoverheid.nl/onderwerpen/gemeenten/vraag-en-antwoord/wanneer-kom-ik-in-aanmerking-voor-kwijtschelding-van-gemeentelijke-belastingen" }],
  },
  {
    id: "huur",
    group: "wonen",
    title: { nl: "Het niet eens met een huurverhoging", en: "Disagreeing with a rent increase" },
    summary: {
      nl: "Vindt u de huurverhoging te hoog of niet terecht? Stuur dan vóór de ingangsdatum een bezwaarbrief naar uw verhuurder.",
      en: "Is the rent increase too high or unfair? Send an objection letter to your landlord before the start date.",
    },
    points: {
      nl: [
        "Komt u er samen niet uit? Dan kan de Huurcommissie het vaak beoordelen. Welke stappen precies gelden, hangt af van uw woning (sociale huur, middenhuur, vrije sector).",
        "Er gelden maximale percentages per jaar. Kijk op de website van de Rijksoverheid of de Huurcommissie.",
      ],
      en: [
        "If you cannot agree, the Rent Tribunal (Huurcommissie) can often assess it. The exact steps depend on your home type.",
        "There are maximum percentages per year. See the Government or Huurcommissie website.",
      ],
    },
    where: [{ name: "Huurcommissie", url: "https://www.huurcommissie.nl" }, JL],
    sources: [{ label: "Rijksoverheid – bezwaar tegen huurverhoging", url: "https://www.rijksoverheid.nl/vraag-en-antwoord/woning-huren/kan-ik-bezwaar-maken-tegen-mijn-huurverhoging" }],
  },
  {
    id: "zorgpremie",
    group: "betalen",
    title: { nl: "Achterstand zorgpremie", en: "Health insurance premium arrears" },
    summary: {
      nl: "U blijft verzekerd, ook als u de premie niet betaalt. Maar na 6 maanden achterstand meldt de verzekeraar u aan bij het CAK. Dan betaalt u een hogere premie.",
      en: "You stay insured even if you don't pay. But after 6 months of arrears, the insurer registers you with the CAK and you pay a higher premium.",
    },
    points: {
      nl: [
        "Spreek snel een betalingsregeling af met uw zorgverzekeraar. Dan wordt u (weer) afgemeld bij het CAK.",
        "De hogere premie aan het CAK lost uw oude schuld niet af.",
        "Aanvullende verzekeringen kunnen bij achterstand wel stoppen.",
      ],
      en: [
        "Agree a payment plan with your insurer quickly. Then you are (again) deregistered at the CAK.",
        "The higher premium to the CAK does not pay off your old debt.",
        "Supplementary insurance can be stopped if you are in arrears.",
      ],
    },
    where: [{ name: "CAK", url: "https://www.hetcak.nl" }, { name: "Geldfit", url: "https://www.geldfit.nl" }],
    sources: [{ label: "Rijksoverheid – premie niet betaald", url: "https://www.rijksoverheid.nl/vraag-en-antwoord/zorgverzekering/wat-gebeurt-er-als-ik-de-premie-van-mijn-zorgverzekering-niet-betaal" }],
  },
  {
    id: "energie",
    group: "wonen",
    title: { nl: "Energierekening en afsluiten", en: "Energy bill and disconnection" },
    summary: {
      nl: "Een energieleverancier mag u niet zomaar afsluiten. Eerst moet hij herinneringen sturen en een betalingsregeling aanbieden.",
      en: "An energy supplier may not simply disconnect you. It must first send reminders and offer a payment plan.",
    },
    points: {
      nl: [
        "Reageer op herinneringen en vraag om een betalingsregeling.",
        "Geef toestemming dat uw gegevens naar de gemeente mogen voor schuldhulp. Zo krijgt u sneller hulp.",
        "Een klacht over uw leverancier? Eerst bij de leverancier zelf, daarna eventueel de Geschillencommissie.",
      ],
      en: [
        "Respond to reminders and ask for a payment plan.",
        "Allow your details to be shared with the municipality for debt help. You get help sooner.",
        "A complaint about your supplier? First to the supplier, then possibly the Disputes Committee.",
      ],
    },
    where: [{ name: "De Geschillencommissie", url: "https://www.degeschillencommissie.nl" }, JL],
    sources: [{ label: "NOS – regels afsluiten energie", url: "https://nos.nl/l/2466713" }],
  },
  {
    id: "kifid",
    group: "klagen",
    title: { nl: "Klacht over verzekeraar of bank (Kifid)", en: "Complaint about an insurer or bank (Kifid)" },
    summary: {
      nl: "Bent u het oneens met uw (schade)verzekeraar of bank? Dien eerst een klacht in bij het bedrijf zelf. Komt u er niet uit, dan kunt u naar Kifid.",
      en: "Disagree with your insurer or bank? First complain to the company itself. If that fails, you can go to Kifid.",
    },
    points: {
      nl: [
        "Het bedrijf krijgt redelijke tijd om te reageren (vaak 8 weken).",
        "Daarna: binnen 3 maanden na het definitieve antwoord naar Kifid (of binnen 1 jaar na uw eerste klacht).",
        "Ga niet eerst naar de rechter: dan kan Kifid niet meer.",
        "Gaat het over uw zorgverzekering? Dan is de SKGZ de klachtenorganisatie.",
      ],
      en: [
        "The company gets reasonable time to respond (often 8 weeks).",
        "Then: within 3 months of the final answer to Kifid (or within 1 year of your first complaint).",
        "Don't go to court first: Kifid can then no longer help.",
        "About your health insurance? Then the SKGZ handles complaints.",
      ],
    },
    where: [{ name: "Kifid", url: "https://www.kifid.nl" }, { name: "SKGZ (zorgverzekering)", url: "https://www.skgz.nl" }],
    sources: [{ label: "Consumentenbond – klacht bij Kifid", url: "https://www.consumentenbond.nl/juridisch-advies/juridische-procedure/klacht-voorleggen-aan-het-kifid" }],
  },
  {
    id: "ombudsman",
    group: "klagen",
    title: { nl: "Klagen over hoe de overheid u behandelt", en: "Complaining about how the government treats you" },
    summary: {
      nl: "Gaat het niet om het besluit, maar om hoe u bent behandeld (onvriendelijk, te laat, geen antwoord)? Dien dan een klacht in.",
      en: "Is it not about the decision, but about how you were treated (rude, late, no answer)? Then file a complaint.",
    },
    points: {
      nl: [
        "Klaag eerst bij de organisatie zelf, het liefst schriftelijk.",
        "Niet tevreden? Dan kunt u naar de Nationale ombudsman (of de ombudsman van uw gemeente), binnen 1 jaar nadat uw klacht is afgehandeld.",
        "Kunt u bezwaar maken tegen het besluit? Dan is dat de juiste weg, niet de ombudsman.",
      ],
      en: [
        "First complain to the organisation itself, preferably in writing.",
        "Not satisfied? Go to the National Ombudsman (or your municipal ombudsman), within 1 year after your complaint was handled.",
        "Can you object to the decision? Then objection is the right route, not the ombudsman.",
      ],
    },
    where: [{ name: "Nationale ombudsman", contact: "0800 - 33 55 555", url: "https://www.nationaleombudsman.nl" }],
    sources: [{ label: "Rijksoverheid – klacht bij de Nationale ombudsman", url: "https://www.rijksoverheid.nl/vraag-en-antwoord/kwaliteit-en-integriteit-overheidsinstanties/hoe-kan-ik-een-klacht-indienen-bij-de-nationale-ombudsman" }],
  },
  {
    id: "rechtshulp",
    group: "hulp",
    title: { nl: "Gratis of goedkope juridische hulp", en: "Free or low-cost legal help" },
    summary: {
      nl: "U hoeft het niet alleen te doen. Het Juridisch Loket geeft gratis advies. Met een laag inkomen betaalt de overheid vaak mee aan een advocaat.",
      en: "You don't have to do it alone. Het Juridisch Loket gives free advice. With a low income the government often helps pay for a lawyer.",
    },
    points: {
      nl: [
        "Het Juridisch Loket: gratis advies per telefoon, online of op een vestiging.",
        "Advocaat via een 'toevoeging': u betaalt dan alleen een eigen bijdrage, afhankelijk van uw inkomen.",
        "Heeft u een rechtsbijstandverzekering? Bel die dan ook.",
      ],
      en: [
        "Het Juridisch Loket: free advice by phone, online or at an office.",
        "A lawyer via legal aid ('toevoeging'): you only pay a personal contribution, depending on your income.",
        "Do you have legal expenses insurance? Call them too.",
      ],
    },
    where: [JL, { name: "Raad voor Rechtsbijstand", url: "https://www.rvr.org" }],
    sources: [{ label: "Het Juridisch Loket", url: "https://www.juridischloket.nl" }],
  },
  {
    id: "inzage",
    group: "klagen",
    title: { nl: "Uw gegevens opvragen (AVG)", en: "Requesting your personal data (GDPR)" },
    summary: {
      nl: "U mag elke organisatie vragen welke gegevens zij over u heeft. Handig als u niet weet waar een rekening of besluit vandaan komt.",
      en: "You may ask any organisation which personal data it holds about you. Useful if you don't know where a bill or decision comes from.",
    },
    points: {
      nl: [
        "De organisatie moet binnen 1 maand antwoorden (soms verlengd).",
        "Het is meestal gratis.",
        "Briefhulp kan de brief voor u maken.",
      ],
      en: ["The organisation must answer within 1 month (sometimes extended).", "It is usually free.", "Briefhulp can write the letter for you."],
    },
    where: [{ name: "Autoriteit Persoonsgegevens", url: "https://www.autoriteitpersoonsgegevens.nl" }],
    sources: [{ label: "Autoriteit Persoonsgegevens – recht op inzage", url: "https://www.autoriteitpersoonsgegevens.nl" }],
  },
];

export const topicById = (id: TopicId) => TOPICS.find((t) => t.id === id)!;
