// Pure SLA helpers for the approval queue. No I/O, so they are trivially
// testable and run identically in the browser (queue UI) and Node (digest +
// tests). A drafted message that has waited too long for human review is
// "stale" — the queue flags it and the daily digest counts it. Nothing here
// sends anything; this is purely about surfacing review latency.

// A drafted message older than this many hours is considered stale.
export const STALE_DRAFT_HOURS = 12;

// Whole-hours-and-minutes age of an ISO timestamp relative to `now`.
// Returns { ms, hours, stale, label } where `stale` is age >= STALE_DRAFT_HOURS.
export function draftSla(createdAt, now = new Date(), staleHours = STALE_DRAFT_HOURS) {
  const created = new Date(createdAt).getTime();
  const ref = new Date(now).getTime();
  const ms = Number.isFinite(created) ? Math.max(0, ref - created) : 0;
  const hours = ms / 3_600_000;
  return { ms, hours, stale: hours >= staleHours, label: ageLabel(ms) };
}

// Short human label: "just now", "42m", "3h", "2d".
export function ageLabel(ms) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Count how many of a list of { created_at } drafts are stale at `now`.
export function countStale(drafts, now = new Date(), staleHours = STALE_DRAFT_HOURS) {
  let n = 0;
  for (const d of drafts ?? []) {
    if (draftSla(d.created_at ?? d.createdAt, now, staleHours).stale) n += 1;
  }
  return n;
}
