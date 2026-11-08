# Briefhulp in de App Store en Play Store zetten

Alles wat in de code kan, is klaar. Wat overblijft, moet u zelf doen, omdat het om **uw** accounts, betalingen en handtekening gaat.
Hieronder staat het stap voor stap, in de volgorde die het snelst werkt.

## Wat het kost

| | Kosten | Wat |
|---|---|---|
| Google Play-ontwikkelaarsaccount | **eenmalig $ 25** | nodig om in de Play Store te komen |
| Apple Developer Program | **$ 99 per jaar** | nodig voor de App Store en TestFlight |
| GitHub (bouwen van de apps) | gratis | uw repository is openbaar |
| Website (Vercel) | gratis | nodig voor de link naar het privacybeleid |

> **Let op, leeftijd:** voor beide accounts moet u **18 jaar of ouder** zijn. Bent u jonger? Laat dan een ouder of voogd het account op zijn/haar naam aanmaken.
> Bij Google moet een **persoonlijk** account bovendien eerst **12 testers 14 dagen** laten testen voordat de app openbaar mag (zie stap 3).

## 0. Wat er al klaar is

- `android/` en `ios/`: de echte app-projecten (Capacitor), app-id **nl.briefhulp.app**.
- Pictogrammen, opstartscherm, meldingspictogram: in alle formaten.
- Toestemmingen: alleen camera, meldingen en internet. Uitleg bij de camera in het Nederlands (iPhone).
- Privacy-manifest voor Apple, geen cloud-back-up op Android.
- **Automatisch bouwen op GitHub** (`.github/workflows/apps.yml`): bij elke push.
  Ga naar **GitHub → Actions → "Apps bouwen" → de laatste run → Artifacts**:
  - `briefhulp-android-test-apk`: zet dit op uw eigen Android-telefoon om te testen.
  - `briefhulp-android-playstore-aab`: dit bestand uploadt u naar de Play Store (na stap 2 ondertekend).
- Store-teksten: `store/listing-nl.md` en `store/listing-en.md`.
- Schermafbeeldingen: `store/screenshots/ios/…` (1290×2796) en `store/screenshots/android/…` (1080×1920), Nederlands en Engels.
- Play Store-pictogram 512×512 en "feature graphic": `store/android/`.
- Antwoorden voor de privacy- en leeftijdsformulieren: `store/privacy-antwoorden.md`.

## 1. Zelf testen op uw Android-telefoon (gratis, vandaag nog)

1. Open op uw telefoon GitHub → Actions → "Apps bouwen" → laatste groene run → download `briefhulp-android-test-apk`.
2. Pak het zip-bestand uit en tik op `app-debug.apk`. Sta "installeren uit onbekende bron" toe voor uw browser of bestandsbeheer.
3. Test: een foto van een brief, voorlezen, "Herinner mij", delen, de Android-terugknop, en een andere taal.

## 2. Een eigen handtekening (sleutel) voor Android maken – één keer

De Play Store wil dat elke versie met **dezelfde sleutel** ondertekend is. **Raak deze sleutel nooit kwijt** en deel hem met niemand.

```bash
keytool -genkeypair -v -keystore briefhulp.jks -alias briefhulp -keyalg RSA -keysize 4096 -validity 10000
```

Zet hem daarna als geheim in GitHub (**Settings → Secrets and variables → Actions → New repository secret**):

| Naam | Waarde |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | de uitkomst van `base64 -w0 briefhulp.jks` (op een Mac: `base64 -i briefhulp.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | het wachtwoord van de keystore |
| `ANDROID_KEY_ALIAS` | `briefhulp` |
| `ANDROID_KEY_PASSWORD` | het wachtwoord van de sleutel |

Bij de volgende push is het AAB-bestand ondertekend. Bewaar `briefhulp.jks` en de wachtwoorden op een veilige plek (bijvoorbeeld een wachtwoordmanager), niet in de repository.

## 3. Google Play

1. Maak een account op **play.google.com/console** ($ 25).
2. **App maken** → naam "Briefhulp – brief uitgelegd", taal Nederlands, App, Gratis.
3. Vul in (alles staat klaar in `store/`):
   - Store-vermelding: korte en volledige beschrijving, pictogram 512, feature graphic, minstens 4 schermafbeeldingen.
   - Privacybeleid-URL (eerst de website online zetten, zie stap 5).
   - Gegevensveiligheid, inhoudsclassificatie, doelgroep, advertenties: zie `privacy-antwoorden.md`.
4. **Testen → Gesloten test**: upload `app-release.aab` en nodig testers uit via e-mail.
   Persoonlijk account: **minstens 12 testers, 14 dagen lang** (regel van Google), daarna kunt u "productietoegang" aanvragen.
   Tip: vraag familie, vrienden, klasgenoten.
5. **Productie** → nieuwe release → AAB uploaden → indienen. De beoordeling duurt meestal een paar dagen.

## 4. Apple App Store

Voor de App Store is een **Mac met Xcode** het makkelijkst. Zonder Mac kan het ook, via een clouddienst (bijv. Codemagic of Ionic Appflow, die bouwen en uploaden voor u; er is een gratis proefniveau).

Met een Mac:
1. Word lid van het **Apple Developer Program** ($ 99/jaar).
2. Op de Mac: `git clone` de repository, dan:
   ```bash
   npm ci && npm run build:app && npx cap sync ios && npx cap open ios
   ```
3. In Xcode: kies bij **Signing & Capabilities** uw team. Zet de versie (bijv. 1.0.0) en het buildnummer.
4. **Product → Archive → Distribute App → App Store Connect**. De app komt in **TestFlight**: test hem eerst zelf op uw iPhone.
5. Op **appstoreconnect.apple.com**: maak de app aan (bundle-id `nl.briefhulp.app`), vul de teksten in (`listing-nl.md`), upload de schermafbeeldingen (`store/screenshots/ios/nl`), vul App Privacy in ("geen gegevens verzameld") en de leeftijd (4+), en plak de notities voor de beoordelaar (staan in `privacy-antwoorden.md`).
6. **Indienen voor beoordeling.** Meestal 1 tot 3 dagen.

## 5. De website online zetten (nodig voor de privacylink)

Beide stores eisen een openbare link naar het privacybeleid en een supportlink.
1. Importeer de repository op **vercel.com** (gratis), regio Frankfurt.
2. Uw privacylink is dan `https://<project>.vercel.app/privacy` en de supportlink `https://<project>.vercel.app/over`.
3. Een eigen domein (bijv. briefhulp.nl, ± € 10 per jaar) oogt betrouwbaarder.

## 6. Optioneel: de AI-uitleg in de app

Standaard werkt de app **helemaal gratis op het toestel**. Wilt u de knop voor de volledige uitleg (Claude)?
1. Zet `ANTHROPIC_API_KEY` op Vercel (dit kost geld per brief; zet een bestedingslimiet).
2. Zet in GitHub **Settings → Variables → `API_BASE`** = uw websiteadres, bijv. `https://briefhulp.nl`.
3. Pas de privacyformulieren aan (zie onderaan `privacy-antwoorden.md`).

## Contactadres in de app

Apple en Google willen dat gebruikers u kunnen bereiken. Maak een apart e-mailadres (bijv. briefhulp.app@gmail.com) en zet het in GitHub:
**Settings → Secrets and variables → Actions → Variables → New variable** `CONTACT_EMAIL`. Het verschijnt dan op de pagina "Over" in de app. Zet het voor de website ook op Vercel als `NEXT_PUBLIC_CONTACT_EMAIL`.

## Vóór u indient: checklist

- [ ] Getest op een echte Android-telefoon (APK) en een echte iPhone (TestFlight).
- [ ] Voorlezen getest in een paar talen, herinnering ontvangen.
- [ ] Rechtenteksten nagekeken door een jurist; vertalingen door moedertaalsprekers.
- [ ] Website online, privacylink werkt.
- [ ] Nergens de indruk wekken dat de app van de overheid is.
- [ ] Contact-e-mailadres voor de stores (bijv. een apart Gmail-adres voor Briefhulp).
- [ ] Naam "Briefhulp" vrij in de stores? Zo niet: kies bijvoorbeeld "Briefhulp NL" of "Briefhulp – brief uitgelegd".

## Nieuwe versie uitbrengen

Wijzig de code, push naar `main`. GitHub bouwt automatisch een nieuwe APK/AAB met een hoger versienummer.
Voor iPhone: op de Mac `git pull && npm run build:app && npx cap sync ios`, dan opnieuw archiveren in Xcode (buildnummer ophogen).
