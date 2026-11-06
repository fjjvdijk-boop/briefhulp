import { NextResponse } from "next/server";
import { answerQuestion, UserFacingError } from "../../../lib/server/claude";
import { clientKey, rateLimit } from "../../../lib/server/ratelimit";
import { LANGUAGES, type QuestionRequest } from "../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!rateLimit(`q:${clientKey(req)}`, 40, 60 * 60 * 1000)) {
    return fail("U heeft veel vragen gesteld. Probeer het later opnieuw.", 429);
  }
  let body: QuestionRequest;
  try {
    body = (await req.json()) as QuestionRequest;
  } catch {
    return fail("Uw vraag kwam niet goed aan.", 400);
  }
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 600) : "";
  if (!question) return fail("Typ eerst uw vraag.", 400);
  if (!body.analysis || typeof body.analysis !== "object") return fail("Maak eerst een foto van een brief.", 400);
  if (JSON.stringify(body.analysis).length > 40_000) return fail("Uw vraag kwam niet goed aan.", 413);
  const history = Array.isArray(body.history)
    ? body.history
        .filter((h) => typeof h?.q === "string" && typeof h?.a === "string")
        .map((h) => ({ q: h.q.slice(0, 600), a: h.a.slice(0, 3000) }))
    : [];
  const language = LANGUAGES.some((l) => l.code === body.language) ? body.language : "nl";

  if (process.env.BRIEFHULP_DEMO === "1" || !process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json({
      answer:
        "Dit is de demo-versie, dus ik kan uw vraag nog niet echt beantwoorden. In de echte versie krijgt u hier een kort en duidelijk antwoord over uw brief.",
    });
  }

  try {
    const answer = await answerQuestion({ analysis: body.analysis, question, language, history });
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UserFacingError) return fail(err.message, err.status);
    return fail("Er ging iets mis. Probeer het opnieuw.", 500);
  }
}
