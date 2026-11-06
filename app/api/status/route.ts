import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Vertelt de app of de (betaalde) AI-uitleg beschikbaar is. Zonder API-sleutel: alleen de gratis uitleg.
export function GET() {
  const demo = process.env.BRIEFHULP_DEMO === "1";
  const ai = demo || Boolean(process.env.ANTHROPIC_API_KEY);
  return NextResponse.json({ ai, demo }, { headers: { "Cache-Control": "no-store" } });
}
