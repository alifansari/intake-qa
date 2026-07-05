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

// --- Callback SLA (speed-to-lead) --------------------------------------------
// "Speed is the lever": a flagged leaked lead should be called back FAST. This is
// a STAFF-facing clock only — it never sends anything to a lead and never touches
// the send chokepoint. Pure math so the Triage countdown, the rep scoreboard, and
// tests all share one definition.

export const DEFAULT_CALLBACK_SLA_MINUTES = 15;

// Countdown / overdue label for a signed millisecond delta (remaining > 0 = time
// left; < 0 = overdue by that much).
export function slaLabel(remainingMs) {
  const overdue = remainingMs < 0;
  const mins = Math.floor(Math.abs(remainingMs) / 60_000);
  const base = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  if (Math.abs(remainingMs) < 60_000) return overdue ? "just overdue" : "under a minute";
  return overdue ? `overdue ${base}` : `${base} left`;
}

// SLA status for one flagged lead. `calledBackAt` (ISO) is when the firm first
// reached out (null if not yet). Returns { dueAt, remainingMs, breached, met, label }.
//   * called back: met = it happened on/before dueAt; not breached (resolved).
//   * not called back: breached = now is past dueAt; remaining counts down.
export function callbackSla({
  flagCreatedAt,
  calledBackAt = null,
  slaMinutes = DEFAULT_CALLBACK_SLA_MINUTES,
  now = new Date(),
}) {
  const created = new Date(flagCreatedAt).getTime();
  const dueMs = created + slaMinutes * 60_000;
  const dueAt = new Date(dueMs).toISOString();

  if (calledBackAt) {
    const cb = new Date(calledBackAt).getTime();
    return {
      dueAt,
      remainingMs: dueMs - cb,
      breached: false,
      met: cb <= dueMs,
      resolved: true,
      label: cb <= dueMs ? "called back in time" : "called back late",
    };
  }
  const remainingMs = dueMs - new Date(now).getTime();
  return {
    dueAt,
    remainingMs,
    breached: remainingMs < 0,
    met: false,
    resolved: false,
    label: slaLabel(remainingMs),
  };
}

// Split a list of { flagCreatedAt, calledBackAt } into breached vs on-track vs
// resolved at `now`. Powers the Triage urgent sort and breach escalation.
export function bucketBySla(leads, slaMinutes = DEFAULT_CALLBACK_SLA_MINUTES, now = new Date()) {
  const breached = [];
  const onTrack = [];
  const resolved = [];
  for (const l of leads ?? []) {
    const s = callbackSla({ ...l, slaMinutes, now });
    if (s.resolved) resolved.push({ ...l, sla: s });
    else if (s.breached) breached.push({ ...l, sla: s });
    else onTrack.push({ ...l, sla: s });
  }
  // Most-overdue first within breached; soonest-due first within on-track.
  breached.sort((a, b) => a.sla.remainingMs - b.sla.remainingMs);
  onTrack.sort((a, b) => a.sla.remainingMs - b.sla.remainingMs);
  return { breached, onTrack, resolved };
}
