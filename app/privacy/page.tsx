import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy – Briefhulp" };

export default function Privacy() {
  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="topbar-btn">
          ← Terug
        </Link>
      </header>
      <main className="screen prose">
        <h1 className="title">Privacy bij Briefhulp</h1>
        <p className="lead">Brieven bevatten persoonlijke gegevens, zoals uw naam, adres, BSN en bedragen. Daarom gaan wij hier heel voorzichtig mee om.</p>

        <h2>In het kort</h2>
        <ul>
          <li>U heeft geen account nodig. Wij vragen niet om uw naam of e-mail.</li>
          <li>Wij bewaren uw foto niet. Wij bewaren de uitleg niet.</li>
          <li>Wij zetten geen inhoud van brieven in logbestanden.</li>
          <li>Wij gebruiken geen advertenties en geen volg-cookies.</li>
          <li>Druk op &quot;Nog een brief&quot; of sluit de app: dan is alles weg van uw scherm.</li>
        </ul>

        <h2>Wat gebeurt er met uw foto?</h2>
        <ol>
          <li>Uw telefoon maakt de foto kleiner. Dat gaat sneller.</li>
          <li>De foto gaat beveiligd (versleuteld, via HTTPS) naar onze server.</li>
          <li>Onze server stuurt de foto direct door naar Claude, de kunstmatige intelligentie van het bedrijf Anthropic. Claude leest de brief en schrijft de uitleg.</li>
          <li>De uitleg komt terug op uw telefoon. Onze server bewaart niets.</li>
        </ol>

        <h2>Anthropic (Claude)</h2>
        <p>
          Anthropic verwerkt uw foto alleen om de uitleg te maken. Anthropic gebruikt gegevens die via de API binnenkomen niet om
          zijn modellen te trainen. Anthropic kan gegevens wel korte tijd bewaren, bijvoorbeeld om misbruik te voorkomen. Hoe lang
          dat is, staat in het privacybeleid van Anthropic. Anthropic is een bedrijf uit de Verenigde Staten.
        </p>

        <h2>Wat bewaart uw telefoon?</h2>
        <p>
          Alleen uw instellingen: of u grote letters wilt, in welke taal u de uitleg wilt, en dat u deze uitleg al heeft gezien.
          Geen brieven.
        </p>

        <h2>Uitleg, geen advies</h2>
        <p>
          Briefhulp legt uit wat er in een brief staat. Het is geen juridisch of financieel advies. Een computer kan fouten maken.
          Controleer belangrijke dingen, zoals bedragen, datums en rekeningnummers, altijd op de brief zelf. Twijfelt u? Neem
          contact op met de afzender, of met Het Juridisch Loket (0800 - 8020, gratis).
        </p>

        <h2>Tips voor uw veiligheid</h2>
        <ul>
          <li>Krijgt u een brief waarin u snel moet betalen en vertrouwt u het niet? Bel de organisatie zelf, via het nummer op hun officiële website.</li>
          <li>De Belastingdienst en de gemeente vragen nooit om te betalen met cadeaukaarten of crypto.</li>
        </ul>

        <p className="hint">Laatst bijgewerkt: november 2026. Dit is een testversie.</p>
        <Link href="/" className="btn btn-primary">Terug naar Briefhulp</Link>
      </main>
    </div>
  );
}
