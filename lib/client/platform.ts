// Website of app uit de App Store / Play Store (Capacitor)? Hier zit alles wat in de app anders werkt:
// de terugknop van Android, de statusbalk, het opstartscherm, meldingen voor deadlines, delen en agenda.
import { Capacitor } from "@capacitor/core";

/** true in de app uit de App Store / Play Store. */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function platform(): "ios" | "android" | "web" {
  try {
    return Capacitor.getPlatform() as "ios" | "android" | "web";
  } catch {
    return "web";
  }
}

/**
 * Adres van de server voor de (optionele) AI-uitleg. Op de website: dezelfde server.
 * In de app: NEXT_PUBLIC_API_BASE (bijv. https://briefhulp.nl). Leeg = de app werkt alleen gratis, op het toestel.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
  if (process.env.NEXT_PUBLIC_PLATFORM === "app" && !base) return "about:blank#geen-server";
  return base.replace(/\/$/, "") + path;
}

/** Is er in deze versie een server? (In de app zonder NEXT_PUBLIC_API_BASE niet.) */
export function hasServer(): boolean {
  return !(process.env.NEXT_PUBLIC_PLATFORM === "app" && !process.env.NEXT_PUBLIC_API_BASE);
}

let started = false;

/** Eenmalig bij het opstarten van de app: terugknop, statusbalk en opstartscherm. */
export async function setupNative(onBack: () => boolean) {
  if (started || !isNative()) return;
  started = true;
  document.documentElement.classList.add("native", `native-${platform()}`);
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);
  // Android-terugknop: eerst binnen de app terug, op het startscherm de app sluiten.
  App.addListener("backButton", () => {
    if (!onBack()) App.exitApp();
  });
  try {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (platform() === "android") await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* niet op elk toestel */
  }
  await SplashScreen.hide().catch(() => {});
}

/* ----------------------------------------- Delen ----------------------------------------- */

/** Deelt tekst (WhatsApp, e-mail…). Geeft false als delen niet kan. */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, dialogTitle: title });
      return true;
    } catch (e) {
      // Gebruiker sloot het deelmenu: dat is geen fout
      return /cancel/i.test(String(e));
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (e) {
      return (e as Error)?.name === "AbortError";
    }
  }
  return false;
}

/** Bewaart een bestand tijdelijk en opent het deelmenu (in de app). Bijvoorbeeld een .ics voor de agenda. */
export async function shareFile(name: string, content: string, title: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const res = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title, files: [res.uri], dialogTitle: title });
    return true;
  } catch (e) {
    return /cancel/i.test(String(e));
  }
}

/* ------------------------------------ Herinneringen ------------------------------------ */

function idFor(key: string) {
  let h = 7;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

/**
 * Zet herinneringen op de telefoon: 3 dagen en 1 dag vóór de deadline, om 9:00 uur.
 * Alleen in de app. Geeft het aantal geplande meldingen (0 = geen toestemming of datum voorbij).
 */
export async function scheduleDeadlineReminders(opts: { key: string; dateIso: string; title: string; body: (daysLeft: number) => string }): Promise<number> {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return 0;
  const [y, m, d] = opts.dateIso.split("-").map(Number);
  const now = Date.now();
  const list = [3, 1, 0]
    .map((days) => ({ days, at: new Date(y, m - 1, d - days, 9, 0, 0) }))
    .filter((x) => x.at.getTime() > now + 60_000)
    .map((x) => ({
      id: idFor(`${opts.key}:${x.days}`),
      title: opts.title,
      body: opts.body(x.days),
      schedule: { at: x.at },
      // Gewone (niet-exacte) herinnering: geen extra systeemtoestemming "wekkers" nodig. Een paar minuten
      // speling rond 9 uur is prima voor een deadline.
      isExactNotification: false,
    }));
  if (!list.length) return 0;
  await LocalNotifications.cancel({ notifications: [3, 1, 0].map((days) => ({ id: idFor(`${opts.key}:${days}`) })) }).catch(() => {});
  await LocalNotifications.schedule({ notifications: list });
  return list.length;
}

export async function cancelDeadlineReminders(key: string) {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [3, 1, 0].map((days) => ({ id: idFor(`${key}:${days}`) })) }).catch(() => {});
}
