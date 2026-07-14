import "server-only";

// ---------------------------------------------------------------------------
// Light per-IP rate limiting for the PUBLIC intake endpoints (/api/intake/*).
//
// SCALE LIMITATION — read before relying on this at volume:
// This limiter is IN-MEMORY and PER-INSTANCE. On Vercel each serverless
// instance/region keeps its own Map, so the effective global limit is
// MAX_PER_WINDOW * (number of live instances), not a true shared budget; it also
// resets on every cold start and fails OPEN on any error (losing a lead to a
// limiter bug is the worse failure). That is fine for a low-traffic demo surface
// but is NOT a real abuse/cost control at scale.
//
// TODO(shared-rate-limit): back this with a SHARED store (Upstash Redis /
// @upstash/ratelimit or Vercel KV) before this endpoint is a real abuse or
// LLM-cost vector. The RateLimitStore seam below is the drop-in point: implement
// `hit()` against Redis (INCR + PEXPIRE sliding window) and inject it once at
// startup via setRateLimitStore() behind a flag — no caller changes required.
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // one chat step per second, sustained — generous

// Abstraction seam: swap the in-memory store for a Redis/KV-backed one without
// touching rateLimited() or any caller. `hit(key, now)` returns true when the
// key is OVER the limit for the current window.
export interface RateLimitStore {
  hit(key: string, now: number): boolean;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  hit(key: string, now: number): boolean {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (list.length >= MAX_PER_WINDOW) {
      this.hits.set(key, list);
      return true;
    }
    list.push(now);
    this.hits.set(key, list);
    // Opportunistic cleanup so the map never grows unbounded.
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => now - t >= WINDOW_MS)) this.hits.delete(k);
      }
    }
    return false;
  }
}

let store: RateLimitStore = new InMemoryRateLimitStore();

// Inject a shared-store implementation (e.g. Redis-backed) at startup. Gated
// behind a flag by the caller; the default stays in-memory so behavior is
// unchanged until a real store is wired.
export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

export function rateLimited(req: Request): boolean {
  try {
    return store.hit(clientIp(req), Date.now());
  } catch {
    return false; // fail open — never lose a lead to the limiter
  }
}
