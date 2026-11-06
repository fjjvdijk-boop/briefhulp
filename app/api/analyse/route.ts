import { NextResponse } from "next/server";
import { analyseLetter, UserFacingError } from "../../../lib/server/claude";
import { clientKey, rateLimit } from "../../../lib/server/ratelimit";
import { makeSample } from "../../../lib/sample";
import { LANGUAGES, type AnalyseRequest } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_PAGES = 6;
const MAX_TOTAL_BASE64 = 4_200_000; // ~3 MB aan bestanden; past binnen de limiet van de meeste hosts
const MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!rateLimit(`a:${clientKey(req)}`, 15, 60 * 60 * 1000)) {
    return fail("U heeft veel brieven achter elkaar gestuurd. Probeer het over een uur opnieuw.", 429);
  }

  let body: AnalyseRequest;
  try {
    body = (await req.json()) as AnalyseRequest;
  } catch {
    return fail("De foto kwam niet goed aan. Probeer het opnieuw.", 400);
  }

  const pages = Array.isArray(body?.pages) ? body.pages : [];
  if (pages.length === 0) return fail("Er is geen foto meegestuurd.", 400);
  if (pages.length > MAX_PAGES) return fail(`U kunt maximaal ${MAX_PAGES} bladzijden tegelijk sturen.`, 400);
  let total = 0;
  for (const p of pages) {
    if (!p || !MEDIA.has(p.mediaType) || typeof p.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(p.data.slice(0, 200))) {
      return fail("Dit bestand wordt niet ondersteund. Gebruik een foto of PDF.", 400);
    }
    total += p.data.length;
  }
  if (total > MAX_TOTAL_BASE64) return fail("De bestanden zijn te groot. Probeer minder bladzijden of een kleinere PDF.", 413);

  const language = LANGUAGES.some((l) => l.code === body.language) ? body.language : "nl";
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);

  // Demo-modus: zonder API-sleutel (of met BRIEFHULP_DEMO=1) een voorbeelduitleg teruggeven.
  if (process.env.BRIEFHULP_DEMO === "1" || !process.env.ANTHROPIC_API_KEY) {
    if (process.env.NODE_ENV === "production" && process.env.BRIEFHULP_DEMO !== "1") {
      return fail("De dienst is nog niet ingesteld (API-sleutel ontbreekt).", 503);
    }
    await new Promise((r) => setTimeout(r, 2500));
    return NextResponse.json({ analysis: makeSample(), demo: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Let op: we loggen nooit de inhoud van brieven.
    const analysis = await analyseLetter({ pages, language, today });
    return NextResponse.json({ analysis }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UserFacingError) return fail(err.message, err.status);
    console.error("[briefhulp] onverwachte fout", err instanceof Error ? err.name : "onbekend");
    return fail("Er ging iets mis. Probeer het opnieuw.", 500);
  }
}
