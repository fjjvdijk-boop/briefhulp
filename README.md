# Briefhulp

**Brief gekregen? Wij leggen het uit.**
Maak een foto van een brief van de Belastingdienst, de gemeente, een verzekeraar of een incassobureau. Briefhulp legt in eenvoudig Nederlands (B1) uit wat er staat, wat u moet doen en voor wanneer.

## Wat is er nieuw in versie 1.0

- **Uitleg in tabbladen (nieuw):** Overzicht · Betalen · Niet eens? · Hulp — overzichtelijk, ook bij lange brieven.
- **"Ik ben het er niet mee eens" (nieuw):** stappenplan per soort brief (overheid/belasting: bezwaar → ingebrekestelling → beroep → klacht; CJIB: officier van justitie → kantonrechter; incasso: specificatie → betwisten; verzekeraar: klacht → Kifid/SKGZ; huur: verhuurder → Huurcommissie), met uitgerekende datum en knop "Schrijf deze brief".
- **11 antwoordbrieven:** betalingsregeling, uitstel, kwijtschelding, bezwaar, beroepschrift, beroep verkeersboete, betwisting, specificatie, ingebrekestelling, klacht en AVG-inzageverzoek.
- **Kennisbank "Uw rechten" (nieuw, /rechten):** 19 onderwerpen (bezwaar, beroep, dwangsom, incassokosten, incassoregister, verjaring, CJIB, betalingsregeling, beslagvrije voet, schuldhulp, toeslagen, kwijtschelding, huur, zorgpremie, energie, Kifid, ombudsman, rechtshulp, AVG) met bronnen en controledatum (`lib/legal/topics.ts`). **Laat deze teksten nakijken door een jurist.**
- **Veilig direct betalen (nieuw):** betaallinks en QR-codes op de brief worden herkend (op het toestel) en gecontroleerd tegen de afzender (groen/rood); officiële website bij CJIB, Belastingdienst e.a.; EPC-betaal-QR (werkt in sommige bank-apps). Nooit betaalhulp bij een vermoedelijke nepbrief.
- **Scheve foto's rechtzetten:** de app zoekt de vier hoeken van het papier en trekt de brief recht, zoals een scanner.
- **Zelfcontrole (nieuw):** IBAN-controlegetal (met herstel van leesfouten O/0, I/1, S/5, B/8) en controle of de bedragen optellen, met groene vinkjes.
- **Brief terugschrijven (nieuw):** betalingsregeling, uitstel, bezwaar (pro forma) of specificatie vragen. Ingevuld met afzender, kenmerken, datum en bedrag; kopiëren, delen, mailen of afdrukken.
- **Meer voorbeelden, mooie link-preview (og.png), strenge Content-Security-Policy, toegankelijkheid (axe: 0 problemen op alle schermen), automatische controle op GitHub (CI).**
- **Slimme camera met kader:** een A4-kader op het scherm met live hulp ("Leg de brief binnen het kader", "Kom iets dichterbij", "Ga iets verder weg", "Te donker", "Houd de telefoon stil"). Is alles goed, dan wordt het kader groen en maakt de app zelf de foto. Daarna: "Is alles goed te lezen?" → Gebruik / Opnieuw. Met lampknop, automatisch bijsnijden tot het kader, en terugval op de gewone camera-app. Alles op het toestel.
- **Opstarten:** eerst *Kies uw taal*, daarna een welkomstscherm (wat het is, gratis, privé, geen advies). Daarna het startscherm.
- **Alle talen (nieuw):** 639 talen te kiezen (alle talen uit de Unicode-taaldatabase plus o.a. Dari, Tarifit en Assyrisch), te zoeken op eigen, Nederlandse of Engelse naam. Kan de telefoon zelf naar die taal vertalen (Chrome Translator API, op het toestel), dan vertaalt Briefhulp de hele app en de uitleg één keer en onthoudt dat — gratis en privé. Anders: Engels + tip voor de vertaalknop van de browser, en de AI-uitleg (als die aan staat) in die taal.
- **Vloeiend voorlezen in elke taal (nieuw):** zin voor zin (geen haperingen of afgebroken zinnen), de mooiste stem van de telefoon per taal (Natural/Neural/Premium eerst), bedragen ("187 euro 40"), telefoonnummers, IBAN's, webadressen en afkortingen (t/m, z.s.m., B.V.) worden goed uitgesproken. Geen stem voor die taal op de telefoon? Dan zegt de app hoe u er gratis een toevoegt. De brief zelf wordt altijd in het Nederlands voorgelezen (`lib/client/speech.ts`).
- **Echt alles in uw taal (nieuw):** ook de kennisbank "Uw rechten", het stappenplan "Niet eens?", de antwoordbrief-schermen, privacy en "Over" zijn vertaald in alle 13 ingebouwde talen (`lib/legal/tr/*`, `lib/i18n/extra/*`, alleen geladen als die taal gekozen is). De antwoordbrieven zelf blijven Nederlands, omdat de organisatie Nederlands is. Talen die de telefoon zelf vertaalt, krijgen deze teksten ook mee.
- **13 talen volledig ingebouwd** (app én gratis uitleg, offline): Nederlands, English, العربية, Türkçe, Polski, Українська, Русский, Română, Español, Français, فارسی, Soomaali, Português. **± 180 andere talen** te kiezen: knoppen in het Engels, AI-uitleg (als die aan staat) in die taal. Arabisch en Farsi van rechts naar links.
- **Betere herkenning:** foto wordt automatisch verbeterd (grijs, contrast, vergroten) en de app waarschuwt bij een donkere, wazige of kleine foto, met een knop "Nieuwe foto".
- **Meer soorten brieven:** CJIB, terugvordering toeslagen, WOZ-beschikking, aangifte-uitnodiging, huurverhoging, jaarafrekening, factuur, dagvaarding en meer.
- **Mijn deadlines:** bewaar een deadline (alleen op de telefoon, zonder foto) en zie hem op het startscherm.
- **Installeerbaar en offline** (service worker), **hele brief voorlezen**, **"Klopte deze uitleg?"** (anoniem: alleen ja/nee + soort brief).
- **Kwaliteit (nieuw):** Lighthouse 94 / 100 / 100 / 100 (snelheid, toegankelijkheid, best practices, SEO). Talen worden pas geladen als ze gekozen zijn (app 251 → 183 kB). Werkt op een scherm van 320 px breed in alle talen, ook met grote letters. Eigen lettertype met nette terugval voor Cyrillisch, Arabisch en Perzisch.
- **Langzamer voorlezen (nieuw):** knop 🐢 naast "Lees voor", wordt onthouden.
- **Beter lezen van echte foto's (nieuw):** schaduw wordt weggewerkt zoals in een scanner-app, papier in de schaduw wordt niet meer afgesneden bij het rechtzetten, de tekstherkenning krijgt een scherpere versie (tot 3000 px), en donkere foto's worden eerst ontruisd. Gemeten met 120 nagebootste telefoonfoto's (schaduw, donker, scheef op tafel, wazig, klein, alles tegelijk): **van 66% naar 98% helemaal goed**. De fotoproef (`tests/photo/`) draait ook automatisch op GitHub.
- **Browsercontrole:** `npm run e2e` (na `npm run build && npm start`) controleert 214 schermen: alle 13 talen × licht/donker × alle tabbladen en pagina's met axe, geen horizontaal scrollen op 320 px, en vloeiend voorlezen. Draait ook automatisch op GitHub.
- **Testset:** `npm test` controleert 14 verzonnen brieven, alle talen (ook of er niets meer in het Engels staat), het voorlezen en de betaalhulp (408/408 goed, met 24 brieven).

> Let op: de vertalingen zijn door AI gemaakt. Laat ze vóór een officiële lancering nakijken door moedertaalsprekers.

## App Store en Play Store

Briefhulp is ook een echte app voor Android en iPhone (Capacitor 8, app-id `nl.briefhulp.app`). In de app zit alles: de gratis uitleg werkt zonder internet.

- **Bouwen:** `npm run build:app` (losse bestanden in `out/`, zonder server) en `npx cap sync`.
- **Automatisch op GitHub** (`.github/workflows/apps.yml`): Android-APK om te testen, AAB voor de Play Store, iPhone-bouw, en een echte test op een **Android-emulator** (de app wordt bestuurd: taal, voorbeeldbrief, voorlezen, tabbladen, terugknop, Arabisch) en in de **iPhone-simulator**, met schermafbeeldingen.
- **Anders in de app:** voorlezen met de stem van de telefoon (ook op Android), herinnering voor een deadline als melding, delen en agenda via het deelmenu, Android-terugknop, opstartscherm, alleen toestemming voor camera en meldingen, geen cloud-back-up.
- **Publiceren:** zie [`store/README.md`](store/README.md): stap voor stap, met kosten, ondertekening, teksten (`store/listing-*.md`), schermafbeeldingen (`store/screenshots/`) en antwoorden voor de privacyformulieren (`store/privacy-antwoorden.md`).

## Twee manieren van uitleggen

| | **Gratis uitleg** (standaard) | **Volledige uitleg** (optioneel) |
|---|---|---|
| Kosten | € 0, altijd | ± 1–10 cent per brief (Claude API) |
| Waar | Op de telefoon zelf (Tesseract + pdf.js) | Server → Claude API |
| Privacy | Brief verlaat de telefoon niet | Beveiligd verstuurd, niets bewaard |
| Wat | Afzender, soort brief, bedrag, deadline, IBAN, kenmerk, urgentie, stappen, moeilijke woorden, nep-check, agenda | Alles, plus uitleg in gewone taal, 9 talen, vragen stellen |

Zonder `ANTHROPIC_API_KEY` draait de app **alleen gratis**: de knop voor de volledige uitleg verschijnt dan niet en er wordt nooit iets afgeschreven.

## Wat de app doet

| | |
|---|---|
| 📷 **Foto of PDF** | Camera opent direct (achtercamera). Meerdere bladzijden (max. 6). Foto's worden op de telefoon verkleind. |
| 🚦 **Urgentie** | Rood / oranje / groen, altijd met tekst en icoon (niet alleen kleur). |
| ✅ **Actielijst** | Genummerde stappen die je kunt afvinken. |
| 📅 **Deadline** | "Nog 9 dagen". Zet hem in je agenda (.ics met herinneringen 3 dagen en 1 dag van tevoren, werkt met iPhone, Android en Outlook) of in Google Agenda. |
| 💶 **Betalen** | Bedrag, IBAN, naam en betalingskenmerk, met kopieerknoppen. |
| ⚠️ **Nep-brief-check** | Waarschuwt bij signalen van oplichting en verwijst naar de Fraudehelpdesk. |
| ⚖️ **Bezwaar** | Of en hoe je bezwaar kunt maken, en de termijn. |
| 🔊 **Voorlezen** | Ingebouwde spraak van de telefoon. |
| 🌍 **Talen** | 13 volledig ingebouwd, ± 180 te kiezen (zie boven). |
| 💬 **Vervolgvragen** | "Wat als ik niet kan betalen?" |
| 🤝 **Hulp** | Passende hulp: Juridisch Loket, BelastingTelefoon, Geldfit, schuldhulp van de gemeente. |
| 📤 **Delen** | Stuur de uitleg naar familie of een hulpverlener (WhatsApp, e-mail), of druk hem af. |
| 🔠 **Grote letters** | Eén knop. Lettertype Atkinson Hyperlegible (gemaakt voor mensen die slecht zien). Donkere modus. |

## Privacy (by design)

- Geen account, geen database, geen analytics, geen cookies.
- Foto's gaan via HTTPS naar de server en direct door naar de Claude API. **Er wordt niets opgeslagen of gelogd.**
- Een BSN wordt door het model gemaskeerd (`*****123`). Daarna maskeert de server nog een keer met de elfproef, als vangnet.
- Anthropic traint niet op API-gegevens. Controleer de actuele bewaartermijn en eventuele *Zero Data Retention* in je contract met Anthropic: die is belangrijk voor een AVG-verwerkersovereenkomst en DPIA.
- De browser bewaart alleen voorkeuren (grote letters, taal, uitleg gezien).

## Starten

```bash
npm install
```

```bash
cp .env.example .env.local   # vul ANTHROPIC_API_KEY in
```

```bash
npm run dev
```

Open http://localhost:3000. Zonder API-sleutel draait de app lokaal in **demo-modus** (voorbeelduitleg).

## Online zetten (aanbevolen: Vercel)

1. Zet deze map in een GitHub-repository.
2. Importeer de repository op vercel.com.
3. Zet de omgevingsvariabele `ANTHROPIC_API_KEY`.
4. Kies als functieregio **Frankfurt (fra1)** of een andere EU-regio.

Let op: `maxDuration = 120` seconden. Op het gratis Vercel-plan is de limiet lager. Analyses duren meestal 15 tot 40 seconden.

## Techniek

- **Next.js 15** (App Router, TypeScript) en React 19. Geen UI-bibliotheek: kleine bundel (±119 kB), snel op oude telefoons.
- **Claude API** (`claude-opus-5-5`, vision) met *structured outputs* (JSON-schema in `lib/schema.ts`), dus altijd geldig, voorspelbaar JSON.
  - Systeemprompt in `lib/prompt.ts`: B1-regels, urgentieregels, kennis van Nederlandse brieven, nep-brief-signalen en hulporganisaties.
  - Prompt caching op de systeemprompt.
  - Automatische fallback (`fallbacks: "default"`) als een veiligheidsfilter onterecht weigert.
- Rate limit per IP in het geheugen (`lib/server/ratelimit.ts`). **Voor productie: vervang dit door Redis/Upstash.**
- Model wijzigen: `BRIEFHULP_MODEL=claude-sonnet-5-5` (sneller en goedkoper; test dan eerst de kwaliteit).

### Bestanden

```
app/page.tsx                 startpagina
app/privacy/page.tsx         privacyverklaring (B1)
app/api/analyse/route.ts     foto's → uitleg (validatie, limieten, demo-modus)
app/api/vraag/route.ts       vervolgvragen
components/BriefApp.tsx      schermen: start → bladzijden → laden → uitleg
components/Result.tsx        de uitleg (urgentie, stappen, deadline, betalen, …)
lib/prompt.ts                instructies voor Claude
lib/schema.ts / types.ts     het antwoordformaat
lib/client/image.ts          foto's verkleinen en draaien (EXIF) op het toestel
lib/client/calendar.ts       .ics-agenda en Google Agenda
```

## Voordat je live gaat met echte gebruikers

1. **Testen met echte brieven** (geanonimiseerd), per soort afzender. Maak hiervan een evaluatieset.
2. **Testen met de doelgroep**: Stichting Lezen & Schrijven, een Taalhuis, ouderenbond, VluchtelingenWerk.
3. **AVG**: DPIA, verwerkersovereenkomst met Anthropic en je hostingpartij, en de privacyverklaring laten nakijken.
4. **Kosten**: één analyse met Opus kost grofweg een paar cent. Zet een bestedingslimiet in de Anthropic Console.
5. **Rate limiting** in Redis, en eventueel Cloudflare Turnstile tegen bots.

## Roadmap (ideeën)

- Native app met Capacitor (camera met automatische randdetectie, pushmeldingen voor deadlines).
- Optioneel "Mijn brieven" (lokaal versleuteld op het toestel, alleen met toestemming).
- Voorlezen met natuurlijke stemmen.
- Brief beantwoorden: conceptbrief voor bezwaar of betalingsregeling.
- Samenwerking met gemeenten en schuldhulp: doorverwijzen met één tik.

---

*Briefhulp geeft uitleg. Het is geen juridisch of financieel advies.*
