// Fotoproef: haalt nagebootste telefoonfoto's (schaduw, donker, scheef, wazig, klein, alles tegelijk) door de app
// en vergelijkt de uitkomst met de schone brief. Faalt als minder dan MIN procent helemaal hetzelfde is.
// Gebruik: python3 tests/photo/degrade.py testbrieven /tmp/fotos 01,03,05,08,12 && node tests/photo/robust.cjs /tmp/fotos
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DIR = process.argv[2];
const CLEAN = process.argv[3] || "testbrieven";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const MIN = Number(process.env.MIN_PCT || 90);
const FIELDS = ["urg", "type", "head", "scam", "pay"];

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  await p.goto(BASE);
  await p.evaluate(() => localStorage.setItem("briefhulp:prefs:v2", JSON.stringify({ lang: "nl", onboarded: true, installDismissed: true })));
  await p.reload();
  const variants = fs.readdirSync(DIR).filter((f) => /\.(jpg|png)$/.test(f)).sort();
  const names = [...new Set(variants.map((f) => f.split("__")[0]))];
  const read = async (file) => {
    await p.setInputFiles("input[multiple]", file);
    await p.waitForSelector(".thumb img");
    await p.click("button.btn-huge");
    await p.waitForSelector(".summary-card", { timeout: 120000 });
    const r = await p.evaluate(() => ({
      urg: document.querySelector(".summary-strip strong")?.textContent,
      type: document.querySelector(".letter-type")?.textContent,
      head: document.querySelector(".headline")?.textContent,
      scam: !!document.querySelector(".card-scam"),
    }));
    if (await p.$("#tab-pay")) {
      await p.click("#tab-pay");
      await p.waitForTimeout(150);
      r.pay = await p.$$eval(".copy-row .mono", (n) => n.map((x) => x.textContent.trim()).join(" ; "));
    }
    await p.click(".topbar-btn");
    await p.waitForSelector(".cta-card");
    return r;
  };
  const ref = {};
  for (const n of names) ref[n] = await read(path.join(CLEAN, n + ".png"));
  let good = 0;
  const per = {};
  for (const f of variants) {
    const [n, v] = f.replace(/\.(jpg|png)$/, "").split("__");
    let r;
    try {
      r = await read(path.join(DIR, f));
    } catch (e) {
      r = { error: String(e).slice(0, 80) };
      await p.goto(BASE);
    }
    const diff = r.error ? ["fout"] : FIELDS.filter((k) => r[k] !== ref[n][k]);
    per[v] = per[v] || [0, 0];
    per[v][1]++;
    if (!diff.length) {
      good++;
      per[v][0]++;
    } else console.log(`✗ ${f}: ${diff.join(", ")}${r.head ? ` → "${r.head}"` : ""}`);
  }
  await b.close();
  const pct = Math.round((100 * good) / variants.length);
  for (const [v, [g, t]] of Object.entries(per)) console.log(`  ${v.padEnd(8)} ${g}/${t}`);
  console.log(`\nFotoproef: ${good}/${variants.length} helemaal goed (${pct}%, minimaal ${MIN}%)`);
  process.exit(pct >= MIN ? 0 : 1);
})();
