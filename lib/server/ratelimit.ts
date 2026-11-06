import "server-only";

// Eenvoudige rate limit in het geheugen (per serverinstantie). Genoeg voor een eerste test;
// gebruik voor productie bijvoorbeeld Upstash Redis of Vercel KV.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "onbekend").trim();
}
