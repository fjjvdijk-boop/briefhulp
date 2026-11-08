// Maakt de bronbeelden voor app-pictogram, opstartscherm en meldingspictogram (assets/).
// Daarna: npx capacitor-assets generate  (maakt alle formaten voor Android en iOS).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const GLYPH = (s = 1) => `
  <g transform="translate(256 256) scale(${s}) translate(-256 -256)">
    <path d="M120 176c0-13 11-24 24-24h224c13 0 24 11 24 24v160c0 13-11 24-24 24H144c-13 0-24-11-24-24z" fill="#fff"/>
    <path d="M128 168l128 96 128-96" fill="none" stroke="#1b3fa6" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="388" cy="356" r="72" fill="#ffc533"/>
    <path d="M356 356l22 22 42-44" fill="none" stroke="#14213d" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
const svg = (body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ""}${body}</svg>`;
// Meldingspictogram (Android): alleen wit op doorzichtig
const NOTIF = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <defs><mask id="m"><rect width="24" height="24" fill="#fff"/>
    <path d="M4.6 7 12 12.5 19.4 7" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="17.5" r="5.6" fill="#000"/></mask></defs>
  <rect x="3" y="5" width="18" height="14" rx="1.6" fill="#fff" mask="url(#m)"/>
  <circle cx="18" cy="17.5" r="4.3" fill="#fff"/>
</svg>`;

const out = (f) => path.join(__dirname, "..", f);
(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, file, transparent = false) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<html><body style="margin:0;background:${transparent ? "transparent" : "#fff"}">${html}</body></html>`);
    await p.screenshot({ path: out(file), omitBackground: transparent });
    await p.close();
  };
  fs.mkdirSync(out("assets"), { recursive: true });
  const box = (w, h, inner, bg) => `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;background:${bg ?? "transparent"}">${inner}</div>`;
  // App-pictogram: vol vierkant (iOS en Android maken zelf de ronde hoeken)
  await shot(box(1024, 1024, svg(GLYPH(1.12), "#1b3fa6")), 1024, 1024, "assets/icon-only.png");
  // Android "adaptive icon": voorgrond binnen de veilige zone (± 66%), achtergrond effen blauw
  await shot(box(1024, 1024, svg(GLYPH(0.78))), 1024, 1024, "assets/icon-foreground.png", true);
  await shot(box(1024, 1024, "", "#1b3fa6"), 1024, 1024, "assets/icon-background.png");
  // Opstartscherm (licht en donker): pictogram in het midden
  const splash = (bg) => box(2732, 2732, `<div style="width:620px;height:620px">${svg(GLYPH(1.15), null)}</div>`, bg);
  await shot(splash("#1b3fa6"), 2732, 2732, "assets/splash.png");
  await shot(splash("#0d1324"), 2732, 2732, "assets/splash-dark.png");
  // Meldingspictogram voor Android in alle dichtheden
  for (const [d, px] of [["mdpi", 24], ["hdpi", 36], ["xhdpi", 48], ["xxhdpi", 72], ["xxxhdpi", 96]]) {
    const dir = `android/app/src/main/res/drawable-${d}`;
    fs.mkdirSync(out(dir), { recursive: true });
    await shot(box(px, px, NOTIF), px, px, `${dir}/ic_stat_briefhulp.png`, true);
  }
  // Store: pictogram 512 (Play Store) en "feature graphic" 1024×500
  fs.mkdirSync(out("store/android"), { recursive: true });
  await shot(box(512, 512, svg(GLYPH(1.12), "#1b3fa6")), 512, 512, "store/android/icon-512.png");
  await b.close();
  console.log("Klaar: assets/ en meldingspictogrammen");
})();
