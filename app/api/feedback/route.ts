import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "../../../lib/server/ratelimit";

export const dynamic = "force-dynamic";

const MODES = new Set(["lokaal", "ai", "demo", "voorbeeld"]);

// "Klopte deze uitleg?" — we bewaren alleen ja/nee, de soort uitleg, het soort brief en de taal.
// Geen tekst, geen foto, geen persoonsgegevens. Te zien in de serverlogs (bijv. Vercel → Logs).
export async function POST(req: Request) {
  if (!rateLimit(`f:${clientKey(req)}`, 30, 60 * 60 * 1000)) return NextResponse.json({ ok: false }, { status: 429 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const clean = (v: unknown, max = 30) => (typeof v === "string" ? v.replace(/[^\w-]/g, "").slice(0, max) : "");
  const entry = {
    t: new Date().toISOString(),
    good: body.good === true,
    mode: MODES.has(String(body.mode)) ? body.mode : "onbekend",
    sender: clean(body.sender),
    type: clean(body.type),
    urgency: clean(body.urgency, 10),
    lang: clean(body.lang, 5),
  };
  console.log("[briefhulp-feedback]", JSON.stringify(entry));
  return NextResponse.json({ ok: true });
}
