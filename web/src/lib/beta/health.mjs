// Pure beta-health logic for the founder board (/studio/beta) and its tests.
// NO I/O — identical for SQLite now and Postgres later (the repo's pure-logic
// convention: reconcile.ts, compliance.mjs, sla.mjs live the same way).
//
// Three jobs:
//   * activationState — BETA_ONBOARDING.md's one activation event: "first
//     callback marked done within 48 hours of the first digest/miss", as a
//     live clock.
//   * unopenedStreak — "three consecutive unopened digests = call the firm"
//     (BETA_ONBOARDING.md), computed from digest_sent / digest_opened events.
//   * parseDigestRunOutcomes — the per-firm outcome of the latest digest.run
//     ledger row (written by /api/digest/run into the errors table).

export const ACTIVATION_WINDOW_HOURS = 48;
export const UNOPENED_STREAK_CALL_THRESHOLD = 3;

// The activation clock for one firm.
//   firstDigestAt   — ISO of the firm's first digest_sent event (or first miss), or null
//   firstCallbackAt — ISO of the firm's first callback_marked event, or null
// Returns { state, hoursLeft?, hoursToActivate? } where state is one of:
//   'waiting'   — no digest/miss yet, the clock has not started
//   'on_clock'  — clock running; hoursLeft until the 48h window closes
//   'activated' — callback marked inside the window (hoursToActivate tells how fast)
//   'missed'    — the window closed with no callback: call the firm
export function activationState({
  firstDigestAt = null,
  firstCallbackAt = null,
  now = new Date(),
  windowHours = ACTIVATION_WINDOW_HOURS,
} = {}) {
  if (!firstDigestAt) return { state: "waiting" };
  const start = new Date(firstDigestAt).getTime();
  if (!Number.isFinite(start)) return { state: "waiting" };
  const deadline = start + windowHours * 3600_000;
  const nowMs = new Date(now).getTime();

  if (firstCallbackAt) {
    const acted = new Date(firstCallbackAt).getTime();
    if (Number.isFinite(acted) && acted <= deadline) {
      return {
        state: "activated",
        hoursToActivate: Math.max(0, Math.round((acted - start) / 3600_000)),
      };
    }
    // Acted, but only after the window — late is better than never, still
    // reported honestly as missed-then-acted.
    return { state: "missed", actedLate: true };
  }
  if (nowMs <= deadline) {
    return { state: "on_clock", hoursLeft: Math.max(0, Math.ceil((deadline - nowMs) / 3600_000)) };
  }
  return { state: "missed" };
}

// Day (YYYY-MM-DD, UTC) an ISO timestamp falls on — the unit digests batch by.
export function dayOf(iso) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

// Consecutive most-recent digests with no recorded open.
//   sends — digest_sent event rows (any order), each with created_at
//   opens — digest_opened event rows, each with created_at (or context.day)
// A send counts as opened when an open lands on the same UTC day or any time
// after it (an open proves the inbox is alive for everything sent before it).
// Returns { streak, lastSentAt, lastOpenedAt, callTheFirm } — opens come from a
// pixel, so they UNDERCOUNT (image-blocking clients); a streak is a "pick up
// the phone" signal, never proof of silence.
export function unopenedStreak({ sends = [], opens = [] } = {}) {
  const sentTimes = sends
    .map((s) => new Date(s.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a); // newest first
  const openTimes = opens
    .map((o) => new Date(o.created_at).getTime())
    .filter(Number.isFinite);
  const lastOpen = openTimes.length ? Math.max(...openTimes) : null;

  let streak = 0;
  for (const t of sentTimes) {
    const opened =
      lastOpen != null &&
      (lastOpen >= t || dayOf(new Date(lastOpen).toISOString()) === dayOf(new Date(t).toISOString()));
    if (opened) break; // everything sent before the newest open counts as reached
    streak += 1;
  }
  return {
    streak,
    lastSentAt: sentTimes.length ? new Date(sentTimes[0]).toISOString() : null,
    lastOpenedAt: lastOpen != null ? new Date(lastOpen).toISOString() : null,
    callTheFirm: streak >= UNOPENED_STREAK_CALL_THRESHOLD,
  };
}

// The newest digest.run ledger row → { at, byFirm: { [firmId]: { mode, reason?, missCount? } } }.
// The rows come from a sibling code path (the errors table), so parse
// DEFENSIVELY: any malformed row returns null rather than throwing into the board.
export function parseDigestRunOutcomes(errorRows = []) {
  for (const row of errorRows ?? []) {
    if (!row || row.source !== "digest.run") continue;
    let ctx = row.context;
    try {
      if (typeof ctx === "string") ctx = JSON.parse(ctx);
    } catch {
      ctx = null;
    }
    const results = ctx && Array.isArray(ctx.results) ? ctx.results : null;
    if (!results) continue; // e.g. the CRON_SECRET fail-loud row — skip to an actual run
    const byFirm = {};
    for (const r of results) {
      if (!r || r.firm == null) continue;
      byFirm[String(r.firm)] = {
        mode: String(r.mode ?? "unknown"),
        reason: r.reason != null ? String(r.reason) : null,
        missCount: Number.isFinite(Number(r.missCount)) ? Number(r.missCount) : null,
      };
    }
    return { at: row.created_at ?? null, message: row.message ?? null, byFirm };
  }
  return null;
}

// Plain-English label for a digest.run per-firm mode (the board never shows
// raw enum values to anyone, founder included).
export function digestOutcomeLabel(outcome) {
  if (!outcome) return "no digest run yet";
  switch (outcome.mode) {
    case "live":
      return "emailed";
    case "test":
      return "rendered to file (email off)";
    case "skipped":
      return `skipped${outcome.reason ? ` — ${outcome.reason}` : ""}`;
    case "error":
      return "failed";
    default:
      return outcome.mode;
  }
}

// Funnel arithmetic for the two conversions that decide everything
// (ops/insights.md B2): audit→pilot and pilot→paid.
export function funnel({ audits = 0, pilots = 0, paid = 0 } = {}) {
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
  return {
    audits,
    pilots,
    paid,
    auditToPilotPct: pct(pilots, audits),
    pilotToPaidPct: pct(paid, pilots),
  };
}
