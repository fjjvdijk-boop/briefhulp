// Haalt de tekst uit een stuk van het scherm (een kaart) om voor te lezen: zoals iemand hem zou voorlezen.
// Knoppen, pictogrammen en verborgen dingen slaan we over; kopjes, regels en lijstjes krijgen een korte pauze.

const SKIP = "button, svg, input, textarea, select, script, style, [aria-hidden='true'], [data-noread], .sr-only, .copy-btn, .speak-card";
const BLOCK = /^(P|LI|H1|H2|H3|H4|H5|H6|DT|DD|DIV|SECTION|SUMMARY|PRE|TR|BLOCKQUOTE|OL|UL|DL|LABEL|DETAILS)$/;

/** Tekst om voor te lezen uit een element. Geeft een lijst van regels (elk een eigen zin of kopje). */
export function readableText(root: Element): string[] {
  const lines: string[] = [];
  let line = "";
  const flush = () => {
    const t = line.replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
    line = "";
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      line += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.matches(SKIP)) return;
    // Dichtgeklapte <details>: alleen de kop (zoals op het scherm)
    if (el.tagName === "DETAILS" && !(el as HTMLDetailsElement).open) {
      const sum = el.querySelector(":scope > summary");
      if (sum) {
        flush();
        walk(sum);
        flush();
      }
      return;
    }
    const block = BLOCK.test(el.tagName) || el.tagName === "BR";
    if (block) flush();
    for (const child of Array.from(el.childNodes)) walk(child);
    if (block) flush();
  };
  walk(root);
  flush();
  // Een regel zonder leesteken aan het eind (kopje, label) krijgt een punt: dan pauzeert de stem even.
  return lines.map((l) => (/[.!?:;؟。]$/.test(l) ? l : `${l}.`));
}

/** De taal van een stuk scherm: het dichtstbijzijnde lang-attribuut, anders die van de pagina. */
export function readableLang(el: Element): string {
  const withLang = el.closest("[lang]");
  return (withLang?.getAttribute("lang") || document.documentElement.lang || "nl").split("-")[0];
}
