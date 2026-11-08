// Alleen voor de app uit de App Store / Play Store: die draait op "capacitor://localhost" (iPhone) of
// "https://localhost" (Android) en mag de server voor de (optionele) AI-uitleg gebruiken. Andere websites niet.
import { NextResponse, type NextRequest } from "next/server";

const APP_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "ionic://localhost"]);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = APP_ORIGINS.has(origin);
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: allowed ? 204 : 403,
      headers: allowed
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
            Vary: "Origin",
          }
        : {},
    });
  }
  const res = NextResponse.next();
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export const config = { matcher: "/api/:path*" };
