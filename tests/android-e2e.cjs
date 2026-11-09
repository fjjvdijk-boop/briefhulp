// Test op een echte Android-emulator (draait op GitHub, zie .github/workflows/apps.yml).
// Installeert de test-APK, bestuurt de app via de WebView en maakt schermafbeeldingen in test-shots/.
// Gebruik (met een emulator of telefoon via adb): node tests/android-e2e.cjs
const { _android: android } = require("playwright");
const fs = require("fs");

const PKG = "nl.briefhulp.app";
const SHOTS = "test-shots";
const fails = [];
let ok = 0;
const check = (name, cond, extra = "") => {
  if (cond) {
    ok++;
    console.log("✓", name);
  } else {
    fails.push(name);
    console.log("✗", name, extra);
  }
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const [device] = await android.devices();
  if (!device) throw new Error("Geen Android-toestel gevonden (adb devices)");
  console.log("Toestel:", device.model());
  await device.shell(`pm grant ${PKG} android.permission.CAMERA`).catch(() => {});
  await device.shell(`am force-stop ${PKG}`);
  await device.shell(`pm clear ${PKG}`); // schone start: taal kiezen, welkom
  await device.shell(`pm grant ${PKG} android.permission.CAMERA`).catch(() => {});
  await device.shell(`am start -n ${PKG}/.MainActivity`);
  const shot = async (name) => fs.writeFileSync(`${SHOTS}/${name}.png`, await device.screenshot());

  const webview = await device.webView({ pkg: PKG }, { timeout: 60_000 });
  const page = await webview.page();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. Opstarten: taal kiezen
  await page.waitForSelector(".lang-btn", { state: "visible", timeout: 60_000 });
  await page.waitForTimeout(2500);
  await shot("01-taal");
  check("app start op het taalscherm", (await page.$$(".lang-btn")).length >= 13);
  check("draait als native app", await page.evaluate(() => document.documentElement.classList.contains("native-android")));

  await page.click('.lang-btn[lang="nl"]');
  await page.waitForSelector(".btn-huge", { timeout: 15_000 });
  await shot("02-welkom");
  await page.click(".btn-huge");

  // 2. Startscherm en voorbeeldbrief
  await page.waitForSelector(".example-chip", { timeout: 15_000 });
  await shot("03-start");
  check("geen 'installeer de app'-melding in de app", !(await page.$(".install-card, .card-install")));
  await page.click(".example-chip >> nth=0");
  await page.waitForSelector(".summary-card", { timeout: 60_000 });
  await page.waitForTimeout(800);
  await shot("04-uitleg");
  const headline = await page.textContent(".headline");
  check("uitleg met bedrag", /€\s?\d/.test(headline || ""), headline);

  // 3. Voorlezen met de stem van de telefoon (plug-in)
  await page.click(".btn-listen");
  await page.waitForTimeout(2500);
  const listening = await page.getAttribute(".btn-listen", "aria-pressed");
  const noVoice = await page.$(".no-voice");
  check("voorlezen start (of meldt netjes dat er geen stem is)", listening === "true" || !!noVoice, `aria-pressed=${listening}`);
  console.log("   voorlezen:", listening === "true" ? "stem van de telefoon spreekt" : noVoice ? "geen stem op dit toestel (melding getoond)" : "?");
  await shot("05-voorlezen");
  if (listening === "true") await page.click(".btn-listen");

  // 3b. Herinnering als melding (toestemming vooraf gegeven)
  await device.shell(`pm grant ${PKG} android.permission.POST_NOTIFICATIONS`).catch(() => {});
  const remindBtn = await page.$(".card-deadline .btn-primary[aria-pressed]");
  check("knop 'Herinner mij' staat in de app", !!remindBtn);
  if (remindBtn) {
    await remindBtn.click();
    await page.waitForSelector(".card-deadline [role=status]", { timeout: 10_000 }).catch(() => {});
    const msg = (await page.textContent(".card-deadline [role=status]").catch(() => "")) || "";
    check("herinnering ingepland", /melding/i.test(msg) && (await page.getAttribute(".card-deadline .btn-primary[aria-pressed]", "aria-pressed")) === "true", msg);
    const alarms = await device.shell(`dumpsys alarm | grep -c ${PKG}`).catch(() => Buffer.from("0"));
    console.log("   geplande alarmen voor de app:", alarms.toString().trim());
    await shot("05b-herinnering");
  }

  // 4. Tabbladen
  for (const tab of ["pay", "disagree", "help"]) {
    await page.click(`#tab-${tab}`);
    await page.waitForTimeout(600);
    await shot(`06-tab-${tab}`);
    if (tab === "disagree") check("tabblad 'Niet eens?' toont stappenplan", !!(await page.$(".card-route")));
  }

  // 5. Rechtenpagina openen (losse pagina in de app)
  await page.click("#tab-help");
  const rights = await page.$('a[href^="/rechten"]');
  if (rights) {
    await rights.click();
    await page.waitForSelector(".topic", { timeout: 15_000 });
    await shot("07-rechten");
    check("rechtenpagina opent in de app", (await page.$$(".topic")).length > 5);
    await device.shell("input keyevent 4"); // Android-terugknop
    await page.waitForTimeout(1500);
  }

  // 6. Android-terugknop: van de uitleg terug naar het startscherm
  await page.waitForTimeout(500);
  await device.shell("input keyevent 4");
  await page.waitForTimeout(1500);
  const backHome = await page.$(".example-chip");
  await shot("08-na-terugknop");
  check("terugknop gaat terug binnen de app", !!backHome);

  // 7. Andere taal (Arabisch, van rechts naar links)
  await page.click(".topbar-btn[aria-label*=':']");
  await page.waitForSelector('.lang-btn[lang="ar"]');
  await page.click('.lang-btn[lang="ar"]');
  await page.waitForTimeout(1500);
  check("Arabisch: van rechts naar links", (await page.evaluate(() => document.documentElement.dir)) === "rtl");
  await shot("09-arabisch");

  // 8. Camera in de app: toestemming, live beeld, foto maken en gebruiken
  await page.waitForSelector(".cta-main", { timeout: 15_000 });
  await page.click(".cta-main");
  const live = await page
    .waitForFunction(() => {
      const v = document.querySelector(".camera-video");
      return v && v.videoWidth > 0 && !v.paused;
    }, null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1200);
  await shot("10-camera");
  check("camera geeft live beeld in de app", live);
  if (live) {
    await page.click(".shutter");
    await page.waitForSelector(".camera-review", { timeout: 10_000 });
    await shot("11-camera-foto");
    await page.click(".camera-review-btns .btn-primary");
    const thumb = await page.waitForSelector(".thumb img", { timeout: 15_000 }).then(() => true).catch(() => false);
    await shot("12-bladzijde");
    check("foto van de camera komt in de app", thumb);
  }

  check("geen scriptfouten", errors.length === 0, errors.slice(0, 3).join(" | "));
  console.log(`\nAndroid-test: ${ok} goed, ${fails.length} fout`);
  await device.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
