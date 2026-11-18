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
    // De allereerste "zin" is een stille spatie: die maakt voorlezen op iPhone mogelijk (zie lib/client/speech.ts)
    const r = await p.evaluate(() => ({ s: window.__spoken.filter((x) => x.text.trim()), overlap: !!window.__overlap }));
    const good = r.s.length >= 5 && !r.overlap && r.s.every((x) => x.lang === bcp && x.text.length <= 180) && !r.s.some((x) => /€|\(|\)/.test(x.text));
    if (good) ok++;
    else fails.push(`✗ voorlezen ${lang}: ${r.s.length} stukken, overlap=${r.overlap}, talen=${[...new Set(r.s.map((x) => x.lang))]}`);
    await ctx.close();
  }

  // 4. Spelerbalk en voorleesknop per kaart: pauze/verder, langzamer, vorige zin, stoppen, en de iPhone-eis
  //    (het eerste geluid moet direct bij de tik beginnen)
  {
    const MOCK2 = () => {
      const voices = [{ name: "Google nl", lang: "nl-NL", default: true, localService: false, voiceURI: "nl" }];
      window.__spoken = [];
      // Zoals een echte browser: een wachtrij, één tegelijk, en cancel() onderbreekt alles
      let cur = null;
      let timer = null;
      const queue = [];
      const startNext = () => {
        if (cur || !queue.length) return;
        cur = queue.shift();
        const u = cur;
        timer = setTimeout(() => { cur = null; u.onend?.(); startNext(); }, 150 + u.text.length * 4);
      };
      document.addEventListener("click", () => { window.__inClick = true; setTimeout(() => (window.__inClick = false), 0); }, true);
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          get speaking() { return !!cur; }, get pending() { return queue.length > 0; }, paused: false,
          getVoices: () => voices, addEventListener() {}, removeEventListener() {}, resume() {}, pause() {},
          cancel() {
            if (timer) clearTimeout(timer);
            const all = [cur, ...queue.splice(0)].filter(Boolean);
            cur = null;
            all.forEach((u) => u.onerror?.({ error: "interrupted" }));
          },
          speak(u) {
            window.__spoken.push({ text: u.text, rate: u.rate, inClick: !!window.__inClick });
            queue.push(u);
            startNext();
          },
        },
      });
      window.SpeechSynthesisUtterance = function (text) { this.text = text; this.volume = 1; };
    };
    const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, reducedMotion: "reduce" });
    await ctx.addInitScript(MOCK2);
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate((v) => localStorage.setItem("briefhulp:prefs:v2", v), prefs("nl"));
    await p.reload();
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
    const ok2 = (name, cond, extra = "") => (cond ? ok++ : fails.push(`✗ spelerbalk: ${name} ${extra}`));
    // Voorlezen via de knop op de kaart "Wat moet u doen?"
    await p.click(".card-actions .speak-card");
    await p.waitForSelector(".speech-bar", { timeout: 5000 }).catch(() => {});
    ok2("balk verschijnt", !!(await p.$(".speech-bar")));
    await p.waitForTimeout(500);
    let sp = await p.evaluate(() => window.__spoken);
    ok2("eerste geluid direct bij de tik (iPhone)", sp.length > 0 && sp[0].inClick, JSON.stringify(sp[0]));
    const real = sp.filter((x) => x.text.trim());
    ok2("leest de kaart voor (zonder knopteksten)", real.length > 0 && !/Kopieer|Schrijf deze brief/.test(real.map((x) => x.text).join(" ")), real[0]?.text);
    // Pauze: er wordt niets meer gezegd
    await p.click(".speech-main");
    const nPause = (await p.evaluate(() => window.__spoken.length));
    const lastBefore = (await p.evaluate(() => window.__spoken.filter((x) => x.text.trim()).at(-1)?.text));
    await p.waitForTimeout(900);
    ok2("pauze: stil", (await p.evaluate(() => window.__spoken.length)) === nPause);
    ok2("pauze: knop wordt 'Verder'", (await p.getAttribute(".speech-main", "aria-label")) === "Verder");
    // Verder: dezelfde zin opnieuw
    await p.click(".speech-main");
    await p.waitForTimeout(250);
    const afterResume = await p.evaluate(() => window.__spoken.filter((x) => x.text.trim()).at(-1)?.text);
    ok2("verder: zelfde zin opnieuw", afterResume === lastBefore, `${lastBefore} → ${afterResume}`);
    // Langzamer: tempo omlaag, en onthouden
    const rateBefore = await p.evaluate(() => window.__spoken.at(-1).rate);
    await p.click(".speech-controls .speech-btn:nth-child(3)");
    await p.waitForTimeout(250);
    const rateAfter = await p.evaluate(() => window.__spoken.at(-1).rate);
    ok2("langzamer", rateAfter < rateBefore, `${rateBefore} → ${rateAfter}`);
    ok2("tempo onthouden", (await p.evaluate(() => localStorage.getItem("briefhulp:speech-rate"))) === "0.78");
    // Voortgang zichtbaar
    ok2("voortgang 'Zin x van y'", /Zin \d+ van \d+/.test((await p.textContent(".speech-progress")) || ""));
    // Stoppen: balk weg, niets meer
    await p.click('.speech-btn[aria-label="Stop met voorlezen"]');
    await p.waitForTimeout(300);
    const nStop = await p.evaluate(() => window.__spoken.length);
    await p.waitForTimeout(700);
    ok2("stoppen: balk weg", !(await p.$(".speech-bar")));
    ok2("stoppen: stil", (await p.evaluate(() => window.__spoken.length)) === nStop);
    // Rechten-onderwerp voorlezen in een andere taal (Turks) met de taal van de tekst
    await p.click("#tab-help");
    await p.$$eval("details.topic", (d) => d.forEach((x) => (x.open = true)));
    await p.click(".topic .speak-card >> nth=0");
    await p.waitForTimeout(400);
    ok2("onderwerp uit 'Uw rechten' wordt voorgelezen", !!(await p.$(".speech-bar")));
    await p.click('.speech-btn[aria-label="Stop met voorlezen"]').catch(() => {});
    // axe op de spelerbalk zelf
    await p.click(".card-help .speak-card").catch(() => {});
    await p.waitForSelector(".speech-bar");
    await check(p, "spelerbalk (axe, 360 px)");
    // Scherm uit / andere app: pauzeren in plaats van blijven hangen
    await p.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p.waitForTimeout(200);
    ok2("scherm uit: pauze", (await p.getAttribute(".speech-main", "aria-label")) === "Verder");
    await ctx.close();
  }

  // 5. Online stem werkt niet (geen internet): overstappen op een stem op het toestel; werkt er geen enkele: melding
  for (const scenario of ["fallback", "none"]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
    await ctx.addInitScript((sc) => {
      const voices = [{ name: "Google Nederlands", lang: "nl-NL", default: true, localService: false, voiceURI: "g" }];
      if (sc === "fallback") voices.push({ name: "Xander", lang: "nl-NL", default: false, localService: true, voiceURI: "x" });
      window.__spoken = [];
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          speaking: false, pending: false, paused: false,
          getVoices: () => voices, addEventListener() {}, removeEventListener() {}, resume() {}, pause() {}, cancel() {},
          speak(u) {
            if (!u.text.trim()) return setTimeout(() => u.onend?.(), 5);
            if (!u.voice || !u.voice.localService) return setTimeout(() => u.onerror?.({ error: "network" }), 20);
            window.__spoken.push({ text: u.text, voice: u.voice.name });
            setTimeout(() => u.onend?.(), 30);
          },
        },
      });
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    }, scenario);
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate((v) => localStorage.setItem("briefhulp:prefs:v2", v), prefs("nl"));
    await p.reload();
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
    await p.click(".btn-listen");
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ s: window.__spoken, msg: document.querySelector(".speech-bar-msg")?.textContent ?? "" }));
    if (scenario === "fallback") {
      if (r.s.length >= 5 && r.s.every((x) => x.voice === "Xander")) ok++;
      else fails.push(`✗ stem op het toestel als de online stem faalt: ${r.s.length} zinnen`);
    } else if (/geen voorleesstem/i.test(r.msg)) ok++;
    else fails.push(`✗ geen werkende stem: geen melding (${r.msg})`);
    await ctx.close();
  }
} finally {
  await b.close();
}

console.log(fails.join("\n"));
console.log(`\nBrowsercontrole: ${ok} goed, ${fails.length} fout`);
process.exit(fails.length ? 1 : 0);
