// Browsercontrole: toegankelijkheid (axe), geen horizontaal scrollen op een klein scherm (320 px),
// licht en donker, alle ingebouwde talen, en vloeiend voorlezen (met nep-stemmen).
// Gebruik: start de app (npm run build && npm start) en draai: npm run e2e
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LANGS = ["nl", "en", "ar", "tr", "pl", "uk", "ru", "ro", "es", "fr", "fa", "so", "pt"];
const fails = [];
let ok = 0;

async function check(p, label) {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { resultTypes: ["violations"] });
    return {
      v: res.violations.map((x) => `${x.id}: ${x.nodes[0].target.join(" ")}`),
      wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  if (r.v.length || r.wide) fails.push(`✗ ${label}${r.wide ? " [horizontaal scrollen]" : ""} ${r.v.join(" | ")}`);
  else ok++;
}

const prefs = (lang, extra = {}) => JSON.stringify({ lang, onboarded: true, installDismissed: true, ...extra });

// Nep-stemmen voor het voorlezen: registreert wat er gezegd wordt en of stukken elkaar overlappen.
const MOCK_SPEECH = () => {
  const voices = ["nl-NL", "tr-TR", "ar-SA", "en-GB"].map((lang) => ({ name: "Google " + lang, lang, default: false, localService: false, voiceURI: lang }));
  window.__spoken = [];
  let busy = 0;
  Object.defineProperty(window, "speechSynthesis", {
    value: {
      get speaking() { return busy > 0; }, get pending() { return false; }, paused: false,
      getVoices: () => voices, addEventListener() {}, removeEventListener() {}, resume() {}, pause() {},
      cancel() { busy = 0; },
      speak(u) {
        if (busy) window.__overlap = true;
        busy++;
        window.__spoken.push({ text: u.text, lang: u.lang });
        setTimeout(() => { busy = Math.max(0, busy - 1); u.onend?.(); }, 20 + u.text.length);
      },
    },
  });
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
};

const b = await chromium.launch();
try {
  // 1. Alle talen × licht/donker × schermen
  for (const scheme of ["light", "dark"]) {
    for (const lang of LANGS) {
      const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, reducedMotion: "reduce", colorScheme: scheme });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => fails.push(`✗ ${scheme}/${lang} scriptfout: ${e.message}`));
      await p.goto(BASE);
      await p.evaluate((v) => localStorage.setItem("briefhulp:prefs:v2", v), prefs(lang, { largeText: lang === "ru" || lang === "uk" }));
      await p.reload();
      await p.waitForTimeout(400);
      const L = `${scheme}/${lang}`;
      await check(p, `${L} start`);
      await p.click(".example-chip >> nth=0");
      await p.waitForSelector(".summary-card");
      for (const tab of ["overview", "pay", "disagree", "help"]) {
        if (!(await p.$(`#tab-${tab}`))) continue;
        await p.click(`#tab-${tab}`);
        await p.waitForTimeout(250);
        await p.$$eval("details", (d) => d.forEach((x) => (x.open = true)));
        await check(p, `${L} uitleg/${tab}`);
      }
      for (const page of ["rechten", "privacy", "over"]) {
        await p.goto(`${BASE}/${page}`);
        await p.waitForTimeout(400);
        await p.$$eval("details", (d) => d.forEach((x) => (x.open = true)));
        await check(p, `${L} /${page}`);
      }
      await ctx.close();
    }
  }

  // 2. Eerste keer openen: taal kiezen en welkomstscherm
  {
    const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.waitForTimeout(500);
    await check(p, "taal kiezen");
    await p.fill("input[type=search]", "duits");
    await p.waitForTimeout(250);
    await check(p, "taal zoeken");
    await p.evaluate(() => localStorage.setItem("briefhulp:prefs:v2", JSON.stringify({ lang: "ar", onboarded: false })));
    await p.reload();
    await p.waitForTimeout(500);
    await check(p, "welkom (ar)");
    await ctx.close();
  }

  // 3. Voorlezen: zin voor zin, in de juiste taal, niets over elkaar heen
  for (const [lang, bcp] of [["nl", "nl-NL"], ["tr", "tr-TR"], ["ar", "ar-SA"]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
    await ctx.addInitScript(MOCK_SPEECH);
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate((v) => localStorage.setItem("briefhulp:prefs:v2", v), prefs(lang));
    await p.reload();
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
    await p.click(".btn-listen");
    await p.waitForFunction(() => document.querySelector(".btn-listen")?.getAttribute("aria-pressed") === "false" && window.__spoken.length > 0, null, { timeout: 15000 }).catch(() => {});
    const r = await p.evaluate(() => ({ s: window.__spoken, overlap: !!window.__overlap }));
    const good = r.s.length >= 5 && !r.overlap && r.s.every((x) => x.lang === bcp && x.text.length <= 180) && !r.s.some((x) => /€|\(|\)/.test(x.text));
    if (good) ok++;
    else fails.push(`✗ voorlezen ${lang}: ${r.s.length} stukken, overlap=${r.overlap}, talen=${[...new Set(r.s.map((x) => x.lang))]}`);
    await ctx.close();
  }
} finally {
  await b.close();
}

console.log(fails.join("\n"));
console.log(`\nBrowsercontrole: ${ok} goed, ${fails.length} fout`);
process.exit(fails.length ? 1 : 0);
