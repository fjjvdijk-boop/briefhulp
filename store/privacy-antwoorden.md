# Antwoorden voor de formulieren van Apple en Google

Deze antwoorden gelden voor de app **zoals hij nu gebouwd wordt**: zonder server (`API_BASE` niet ingesteld).
Dan gaat er niets van de telefoon af. Zet u later de AI-uitleg aan (variabele `API_BASE`), lees dan het blok
"Als de AI-uitleg aan staat" onderaan en pas de formulieren aan.

---

## Apple – App Privacy ("privacy-voedingslabel")

**Verzamelt u of externe partners gegevens met deze app?** → **Nee, we verzamelen geen gegevens.**

Waarom dat klopt:
- De foto en de uitleg blijven op het toestel (tekstherkenning met Tesseract, op het toestel).
- Geen account, geen analytics, geen advertenties, geen tracking-SDK's.
- Wat lokaal bewaard wordt (taal, grote letters, "Mijn deadlines", naam en adres voor de antwoordbrief) verlaat de telefoon nooit.
- Het privacy-manifest (`ios/App/App/PrivacyInfo.xcprivacy`) zegt hetzelfde: geen tracking, geen verzamelde gegevens.

**Tracking (App Tracking Transparency):** niet van toepassing, de app volgt niemand.

**Export compliance (versleuteling):** `ITSAppUsesNonExemptEncryption = NO` staat al in Info.plist. De app gebruikt alleen standaard HTTPS van het systeem.

## Apple – Leeftijdsclassificatie

Alle vragen: **Geen** (geen geweld, seks, gokken, drugs, grof taalgebruik, enz.). Onbeperkte toegang tot internet: **Nee**. → **4+**

## Apple – Notities voor de beoordelaar (App Review)

> Briefhulp explains official Dutch letters (tax office, municipality, debt collectors) in plain language.
> Everything runs on the device: text recognition, explanation, reminders and read-aloud. No account is needed.
> To test without a real letter: on the start screen, scroll to "Voorbeeld" / "Example" and tap one of the example letters.
> To test the camera: take a photo of any printed letter; the app guides you with a frame.
> The app is not legal or financial advice; this is stated in the app and the description.
> Permissions: camera (photo of the letter), notifications (optional deadline reminder).

## Google Play – Gegevensveiligheid (Data safety)

- **Verzamelt of deelt uw app een van de vereiste typen gebruikersgegevens?** → **Nee**
- **Zijn alle gegevens versleuteld tijdens verzending?** → Ja (er wordt niets verzonden; als de AI-uitleg aan staat via HTTPS)
- **Kunnen gebruikers verzoeken om verwijdering van gegevens?** → Niet van toepassing (er worden geen gegevens bewaard buiten het toestel; de app verwijderen wist alles).

## Google Play – Inhoudsclassificatie (IARC)

Categorie: **Hulpprogramma / productiviteit / overig**. Alle vragen over geweld, seks, taal, drugs, gokken: **Nee**.
Delen gebruikers informatie met elkaar / interactie? **Nee**. Deelt de app de locatie? **Nee**. Digitale aankopen? **Nee**. → Verwacht: **PEGI 3 / Iedereen**.

## Google Play – Overige verklaringen

- **Doelgroep:** 18+ (volwassenen; de app is niet gericht op kinderen).
- **Advertenties:** Nee.
- **Overheids-app?** Nee. Belangrijk: de app is **niet** van de overheid. Zeg dat ook nergens; de naam van de Belastingdienst e.d. staat alleen in de uitleg. (Google en Apple keuren apps af die doen alsof ze van de overheid zijn.)
- **Financiële functies?** Nee, de app voert geen betalingen uit en is geen financiële dienst. Hij toont alleen de betaalgegevens die op de brief staan.
- **Gezondheid?** Nee.
- **Toestemmingen:** CAMERA (foto van de brief), POST_NOTIFICATIONS (herinnering), INTERNET (alleen nodig als de AI-uitleg aan staat).

## Privacybeleid-URL (verplicht in beide stores)

`https://<uw-domein>/privacy/` – de pagina zit in de app en op de website. Zet de website eerst online (zie README).

---

## Als de AI-uitleg aan staat (`API_BASE` ingesteld)

Dan wordt een foto **alleen als de gebruiker op de knop voor de volledige uitleg tikt** naar uw server en naar Anthropic (Claude) gestuurd, en direct weer vergeten. Pas dan aan:

- **Apple:** "Ja, we verzamelen gegevens" → *Gebruikersinhoud → Foto's of video's* en *Overige gebruikersinhoud*: **niet gekoppeld aan de gebruiker, niet voor tracking**, doel **App-functionaliteit**. (Apple telt gegevens die alleen kort voor het verzoek worden gebruikt soms niet als "verzameld"; bij twijfel: wel opgeven.)
  De knop "Klopte deze uitleg?" stuurt anoniem ja/nee + soort brief → *Gebruiksgegevens → Productinteractie*, niet gekoppeld, doel *Analyse*.
- **Google:** *Foto's* en *Overige door de gebruiker gemaakte inhoud*: **verzameld, niet gedeeld met derden voor eigen doeleinden** (Anthropic is verwerker), **tijdelijk verwerkt** (vink "gegevens worden tijdelijk verwerkt" aan), **optioneel**.
- Sluit een **verwerkersovereenkomst** met Anthropic en uw hosting, en zet dit in de privacyverklaring (staat er al in).
