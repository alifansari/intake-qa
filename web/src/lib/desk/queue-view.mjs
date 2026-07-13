// Pure view logic for the missed-cases queue (no I/O — unit-testable, shared
// by the server page and the client card). This file encodes three persona
// rails from the 2026-07-10 intake-staff field guide, so read before editing:
//
//   1. B-010 — the queue must stay "today’s list", not a graveyard: terminal
//      cards collapse into a compact done section; active cards sort
//      oldest-actionable first (the caller who has waited longest is the top
//      card — one queue, one next action).
//   2. B-013 — urgency is HONEST ELAPSED TIME ONLY. We never compute or
//      display a statute-of-limitations deadline date; the firm’s lawyer owns
//      deadlines. Escalating visual weight, always paired with the path to
//      green (the call button is right there) — never a red number.
//   3. B-011 — attempt nudges are encouragement grounded in the callback
//      science (Velocify, 3.5M leads: 93% of conversions happen by call 6;
//      most firms stop at 2). Never surveillance, never a quota, and they
//      stop entirely on terminal outcomes.

// Terminal workflow statuses: nothing further to do on the card. Kept in sync
// with the flag_status CHECK constraint (migrations 0023 sqlite / 0031 supabase).
export const TERMINAL_STATUSES = Object.freeze(["signed", "didnt_sign", "bad_number"]);

const TERMINAL_SET = new Set(TERMINAL_STATUSES);

export function isTerminal(status) {
  return TERMINAL_SET.has(status ?? "");
}

// Statuses that represent a logged touch (the coordinator tried the caller).
// Writing one of these increments flag_status.attempts in the data layer.
export const ATTEMPT_STATUSES = Object.freeze(["reached_out", "back_in_touch"]);

// B-010 — split the queue into the active list (sorted oldest-actionable
// first, so the longest-waiting caller is the top card) and the done pile
// (terminal cards, most recently resolved first, rendered compact).
// `leaks` items need `.saveStatus` (canonical status key or null) and
// `.callDate` (ISO string). Returns new arrays; input order is untouched.
export function partitionLeaks(leaks) {
  const active = [];
  const done = [];
  for (const l of leaks ?? []) (isTerminal(l.saveStatus) ? done : active).push(l);
  active.sort((a, b) => timeOf(a.callDate) - timeOf(b.callDate));
  return { active, done };
}

function timeOf(iso) {
  const t = new Date(iso ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

// B-013 — honest elapsed-time urgency for an active card.
// Returns { days, tone, label } where tone escalates the card’s visual weight:
//   "fresh"  (< 2 days)  — best window to call; quiet styling.
//   "aging"  (2–6 days)  — gentle amber; still very winnable.
//   "urgent" (7+ days)   — strongest weight, but the framing stays "worth a
//                          call today", never doom: the path to green is the
//                          dial button on the same card.
// COMPLIANCE RAIL: elapsed time since the call ONLY. No statute-of-limitations
// math, no deadline dates, ever — that judgment belongs to the firm’s lawyer.
export function callUrgency(callDateIso, now = Date.now()) {
  const ms = now - timeOf(callDateIso);
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days < 2) {
    return {
      days,
      tone: "fresh",
      label: days === 0 ? "Came in today — catch them while it’s fresh" : "Came in yesterday — still fresh",
    };
  }
  if (days < 7) {
    return { days, tone: "aging", label: `Waiting ${days} days — still very winnable` };
  }
  const waited = days < 14 ? `Waiting ${days} days` : `Waiting ${Math.floor(days / 7)} weeks`;
  return { days, tone: "urgent", label: `${waited} — worth a call today` };
}

// B-011 — the post-attempt encouragement line. Returns null when there is
// nothing to say: before the first logged attempt (the card itself is the
// prompt) and on terminal outcomes (the stopping rule is "signed / passed /
// bad number", nothing else — once it’s decided, we stop asking).
// Tone rail: encouragement and legitimized persistence, NEVER surveillance —
// no red numbers, no "only N calls", no comparison to anyone.
export function attemptNudge(attempts, status) {
  if (isTerminal(status)) return null;
  const n = Number(attempts) || 0;
  if (n <= 0) return null;
  if (n <= 2) {
    // Calls 1–2: this is where most firms quit. Legitimize the next try.
    return `Try ${n} logged. Most signups happen between calls 3 and 6 — worth another try.`;
  }
  if (n <= 5) {
    // Calls 3–5: the sweet spot. Credit the persistence.
    return `Try ${n} logged — you’re in the range where most cases get signed (calls 3–6). Keep going.`;
  }
  // Call 6+: a complete workup. Credit it and hand the judgment back.
  return `Try ${n} logged — that’s a full effort (93% of callers who ever pick up have by call 6). Your judgment from here.`;
}
