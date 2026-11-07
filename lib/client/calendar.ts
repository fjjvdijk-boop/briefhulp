import type { Analysis } from "../types";
import type { Dict } from "../i18n/nl";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
// RFC 5545: regels niet langer dan 75 octets
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > 73) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

export function eventTitle(a: Analysis, t: Dict) {
  return t.result.calendarTitle(a.deadline.what || t.result.actionNeeded, a.sender.name);
}

export function eventDescription(a: Analysis, t: Dict) {
  const steps = a.actions.map((s, i) => `${i + 1}. ${s.step}`).join("\n");
  const pay = a.payment.needed
    ? `\n\n${t.result.pay}: ${a.payment.amount ?? ""}\nIBAN: ${a.payment.iban ?? "-"}\n${t.result.reference}: ${a.payment.reference ?? "-"}`
    : "";
  return `${a.headline}\n\n${t.result.whatToDo}\n${steps}${pay}\n\n${t.result.shareFooter}`;
}

/** Afspraak (hele dag) op de deadline, met meldingen 3 dagen en 1 dag van tevoren om 9:00. */
export function buildIcs(a: Analysis, t: Dict): string | null {
  if (!a.deadline.date) return null;
  const [y, m, d] = a.deadline.date.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const next = new Date(y, m - 1, d + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const uid = `${stamp}-${Math.random().toString(36).slice(2)}@briefhulp`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Briefhulp//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(day)}`,
    `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${esc("⏰ " + eventTitle(a, t))}`,
    `DESCRIPTION:${esc(eventDescription(a, t))}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${t.result.calendarSoon3}: ${eventTitle(a, t)}`)}`,
    "TRIGGER:-P2DT15H",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${t.result.calendarSoon1}: ${eventTitle(a, t)}`)}`,
    "TRIGGER:-PT15H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(a: Analysis, t: Dict) {
  const ics = buildIcs(a, t);
  if (!ics) return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "briefhulp-herinnering.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function googleCalendarUrl(a: Analysis, t: Dict) {
  if (!a.deadline.date) return null;
  const [y, m, d] = a.deadline.date.split("-").map(Number);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(a, t),
    dates: `${ymd(new Date(y, m - 1, d))}/${ymd(new Date(y, m - 1, d + 1))}`,
    details: eventDescription(a, t),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Aantal dagen van vandaag tot de deadline (negatief = verlopen). */
export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function formatDateLong(iso: string, loc = "nl-NL") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(loc, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function localToday() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
