// Constant-time Bearer-token check for cron/founder endpoints. The webhook path
// (ingest/callrail.mjs) already uses timingSafeEqual; the cron routes compared
// with plain `===`, a (small) timing oracle on CRON_SECRET. This makes them
// consistent: equal-length timingSafeEqual, length-mismatch fails fast without
// leaking anything more than the (public-length) token format.
import { timingSafeEqual } from "node:crypto";

// True iff the request's Authorization header is exactly `Bearer <secret>`,
// compared in constant time. Returns false when either side is missing/empty.
export function bearerMatches(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret) return false;
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const got = Buffer.from(String(header), "utf8");
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}
