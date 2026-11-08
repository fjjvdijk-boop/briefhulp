// Maakt de schermafbeeldingen voor de App Store en Play Store (NL en EN), met een korte kop erboven.
// Gebruik: npm run build:app, serveer out/ (bijv. python3 -m http.server 3001 in out/), dan:
//   node scripts/store-screenshots.cjs http://localhost:3001
// Resultaat: store/screenshots/{ios,android}/{nl,en}/01-….png en store/android/feature-graphic.png
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:3001";
const OUT = path.join(__dirname, "..", "store");

const CAPTIONS = {
  nl: [
    ["Brief gekregen?", "Maak een foto. Briefhulp legt hem uit in gewone taal."],
    ["Wat moet u doen?", "Urgentie, bedrag en deadline in één oogopslag."],
    ["Veilig betalen", "Gecontroleerde gegevens, met kopieerknoppen."],
    ["Niet eens?", "Stap voor stap: bezwaar, beroep of klacht."],
    ["Pas op voor nepbrieven", "Briefhulp waarschuwt bij signalen van oplichting."],
    ["In uw eigen taal", "13 talen ingebouwd, ook voorlezen. Gratis en privé."],
  ],
  en: [
    ["Got a letter?", "Take a photo. Briefhulp explains it in plain language."],
    ["What do you need to do?", "Urgency, amount and deadline at a glance."],
    ["Pay safely", "Checked details, with copy buttons."],
    ["Disagree?", "Step by step: objection, appeal or complaint."],
    ["Watch out for scams", "Briefhulp warns you about signs of fraud."],
    ["In your own language", "13 languages built in, with read aloud. Free and private."],
  ],
};

// Scènes: wat er in de app gebeurt vóór de foto
const SCENES = [
  async (p) => {},
  async (p) => {
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
  },
  async (p) => {
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
    await p.click("#tab-pay");
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector("#tabpanel")?.scrollIntoView({ block: "start" }));
  },
  async (p) => {
    await p.click(".example-chip >> nth=0");
    await p.waitForSelector(".summary-card");
    await p.click("#tab-disagree");
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector("#tabpanel")?.scrollIntoView({ block: "start" }));
  },
  async (p) => {
    await p.click(".example-chip >> nth=3");
    await p.waitForSelector(".card-scam");
    await p.evaluate(() => document.querySelector(".card-scam")?.scrollIntoView({ block: "center" }));
  },
  "language",
];

const FORMATS = {
  ios: { w: 1290, h: 2796, device: { width: 393, height: 852 } },
  android: { w: 1080, h: 1920, device: { width: 360, height: 640 } },
};

async function appShot(b, lang, scene, device) {
  const ctx = await b.newContext({ viewport: device, deviceScaleFactor: 3, reducedMotion: "reduce", colorScheme: "light" });
  const p = await ctx.newPage();
  await p.goto(BASE);
  if (scene === "language") await p.evaluate(() => localStorage.clear());
  else await p.evaluate((l) => localStorage.setItem("briefhulp:prefs:v2", JSON.stringify({ lang: l, onboarded: true, installDismissed: true })), lang);
  await p.reload();
  await p.waitForTimeout(700);
  // Het gele "voorbeeld"-label hoort niet in een store-afbeelding
  await p.addStyleTag({ content: ".note-yellow{display:none!important}" });
  if (typeof scene === "function") await scene(p);
  await p.waitForTimeout(400);
  const buf = await p.screenshot();
  await ctx.close();
  return buf.toString("base64");
}

async function frame(b, fmt, title, sub, img, file) {
  const { w, h, device } = FORMATS[fmt];
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const shotW = Math.round(w * 0.8);
  const shotH = Math.round((shotW * device.height) / device.width);
  await p.setContent(`<html><head><style>
    body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;
      background:linear-gradient(170deg,#1b3fa6 0%,#2450c8 55%,#f6f4ef 55.1%);}
    .cap{color:#fff;text-align:center;padding:${Math.round(h * 0.05)}px ${Math.round(w * 0.07)}px 0}
    h1{font-size:${Math.round(w * 0.075)}px;margin:0 0 ${Math.round(h * 0.012)}px;line-height:1.1}
    p{font-size:${Math.round(w * 0.04)}px;margin:0;opacity:.92;line-height:1.3}
    .phone{position:absolute;left:${(w - shotW) / 2}px;top:${Math.round(h * 0.2)}px;width:${shotW}px;height:${shotH}px;
      border-radius:${Math.round(w * 0.06)}px;overflow:hidden;box-shadow:0 30px 80px rgba(10,20,50,.35);border:${Math.round(w * 0.012)}px solid #0d1324;background:#fff}
    .phone img{width:100%;display:block}
  </style></head><body><div class="cap"><h1>${title}</h1><p>${sub}</p></div>
  <div class="phone"><img src="data:image/png;base64,${img}"></div></body></html>`);
  await p.waitForTimeout(200);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await p.screenshot({ path: file });
  await p.close();
}

(async () => {
  const b = await chromium.launch();
  for (const fmt of Object.keys(FORMATS)) {
    for (const lang of ["nl", "en"]) {
      for (let i = 0; i < SCENES.length; i++) {
        const img = await appShot(b, lang, SCENES[i], FORMATS[fmt].device);
        const [title, sub] = CAPTIONS[lang][i];
        const file = path.join(OUT, "screenshots", fmt, lang, `0${i + 1}.png`);
        await frame(b, fmt, title, sub, img, file);
        console.log("✓", path.relative(OUT, file));
      }
    }
  }
  // Play Store "feature graphic" (1024×500)
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  const icon = fs.readFileSync(path.join(OUT, "android", "icon-512.png")).toString("base64");
  await p.setContent(`<html><body style="margin:0;width:1024px;height:500px;display:flex;align-items:center;gap:48px;padding:0 72px;box-sizing:border-box;
    background:linear-gradient(120deg,#1b3fa6,#2a57d6);font-family:system-ui,sans-serif;color:#fff">
    <img src="data:image/png;base64,${icon}" style="width:200px;height:200px;border-radius:44px;box-shadow:0 16px 40px rgba(0,0,0,.3)">
    <div><div style="font-size:72px;font-weight:800">Briefhulp</div>
    <div style="font-size:34px;opacity:.95;margin-top:8px">Brief gekregen? Wij leggen het uit.</div>
    <div style="font-size:24px;opacity:.85;margin-top:18px">Gratis · privé · 13 talen · voorlezen</div></div></body></html>`);
  await p.screenshot({ path: path.join(OUT, "android", "feature-graphic.png") });
  await b.close();
  console.log("✓ android/feature-graphic.png");
})();
