import "server-only";

// ---------------------------------------------------------------------------
// Light per-IP rate limiting for the PUBLIC intake endpoints (/api/intake/*).
// In-memory sliding window — good enough for a demo surface on a single
// serverless instance; a shared store can slot in behind the same function
// if the demo ever needs it. Fails OPEN on any error: losing a lead to a
// rate-limiter bug would be the worse failure.
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // one chat step per second, sustained — generous

const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

export function rateLimited(req: Request): boolean {
  try {
    const ip = clientIp(req);
    const now = Date.now();
    const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (list.length >= MAX_PER_WINDOW) {
      hits.set(ip, list);
      return true;
    }
    list.push(now);
    hits.set(ip, list);
    // Opportunistic cleanup so the map never grows unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
      }
    }
    return false;
  } catch {
    return false; // fail open — never lose a lead to the limiter
  }
}
