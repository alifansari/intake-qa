// Pure view helpers for the live-triage desk. Focused on B-026's deadlineWatch
// (the safety-net panel's filing-deadline aggregate) plus a sort/tone sanity.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deadlineWatch,
  triageQueueSort,
  solTone,
  liveUrgency,
  withLiveUrgency,
  isEngineOverride,
} from "../src/lib/desk/triage-view.mjs";

const row = (status, sol_urgency, extra = {}) => ({ status, sol_urgency, ...extra });

test("deadlineWatch counts ONLY open cases; terminal cases never count", () => {
  const rows = [
    row("new", "critical"),
    row("callback", "soon"),
    row("contacted", "ok"),
    row("signed", "critical"), // terminal — excluded
    row("declined", "expired"), // terminal — excluded
    row("referred", "soon"), // terminal — excluded
  ];
  const w = deadlineWatch(rows);
  assert.equal(w.openTotal, 3);
  assert.equal(w.withClock, 3);
  assert.equal(w.critical, 1);
  assert.equal(w.soon, 1);
  assert.equal(w.expired, 0);
  assert.equal(w.noClock, 0);
});

test("deadlineWatch buckets urgencies and flags no-clock (unknown / missing)", () => {
  const rows = [
    row("new", "expired"),
    row("new", "critical"),
    row("new", "critical"),
    row("callback", "soon"),
    row("contacted", "ok"),
    row("new", "unknown"), // no incident date → no clock
    row("new", undefined), // missing → treated as no clock
  ];
  const w = deadlineWatch(rows);
  assert.equal(w.openTotal, 7);
  assert.equal(w.withClock, 5);
  assert.equal(w.expired, 1);
  assert.equal(w.critical, 2);
  assert.equal(w.soon, 1);
  assert.equal(w.noClock, 2);
});

test("deadlineWatch is safe on empty / non-array input", () => {
  const zero = { openTotal: 0, withClock: 0, expired: 0, critical: 0, soon: 0, noClock: 0 };
  assert.deepEqual(deadlineWatch([]), zero);
  assert.deepEqual(deadlineWatch(null), zero);
  assert.deepEqual(deadlineWatch(undefined), zero);
});

test("triageQueueSort puts attorney-review and critical SOL first", () => {
  const rows = [
    { created_at: "2026-07-01", sol_urgency: "ok", grade_letter: "B" },
    { created_at: "2026-07-02", sol_urgency: "critical", grade_letter: "C" },
    { created_at: "2026-07-03", sol_urgency: "ok", grade_letter: "B", attorney_review: 1 },
  ];
  const sorted = triageQueueSort(rows);
  assert.equal(sorted[0].attorney_review, 1); // review first
  assert.equal(sorted[1].sol_urgency, "critical"); // then critical deadline
});

test("solTone maps urgency to tone + phrase", () => {
  assert.equal(solTone("critical").tone, "bad");
  assert.equal(solTone("soon").tone, "warn");
  assert.equal(solTone("ok").tone, "good");
  assert.equal(solTone("whatever").tone, "neutral");
});

// ---- B-026 slice 3: live urgency recompute (never stale) -----------------

test("liveUrgency recomputes bands from the deadline date", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  assert.equal(liveUrgency("2026-06-15", now), "critical"); // 14 days
  assert.equal(liveUrgency("2026-08-15", now), "soon"); // ~75 days
  assert.equal(liveUrgency("2027-06-01", now), "ok"); // ~1 year
  assert.equal(liveUrgency("2026-05-01", now), "expired"); // past
  assert.equal(liveUrgency(null, now), "unknown");
  assert.equal(liveUrgency("not-a-date", now), "unknown");
});

// ---- B-029: the asymmetric override gate --------------------------------

test("isEngineOverride gates ONLY a decline-direction move on an engine-viable case", () => {
  // Overruling toward a NO on a viable case -> gated (needs a logged reason).
  assert.equal(isEngineOverride("sign_now", "declined"), true);
  assert.equal(isEngineOverride("sign_now", "referred"), true);
  assert.equal(isEngineOverride("develop", "declined"), true);
  // Escalating toward caution is FREE (never gated).
  assert.equal(isEngineOverride("sign_now", "callback"), false);
  assert.equal(isEngineOverride("sign_now", "contacted"), false);
  assert.equal(isEngineOverride("sign_now", "signed"), false);
  // Declining a case the engine ALSO declined/referred = agreeing, not overriding.
  assert.equal(isEngineOverride("decline_with_grace", "declined"), false);
  assert.equal(isEngineOverride("refer_out", "referred"), false);
});

test("withLiveUrgency overrides a STALE stored urgency from the deadline", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  // stored "soon" but the deadline is 10 days out -> the case is really critical
  const r = withLiveUrgency({ sol_deadline: "2026-06-11", sol_urgency: "soon" }, now);
  assert.equal(r.sol_urgency, "critical");
  // no deadline -> the stored value stands (usually "unknown")
  assert.equal(withLiveUrgency({ sol_urgency: "unknown" }, now).sol_urgency, "unknown");
  // never mutates the input
  const input = { sol_deadline: "2026-06-11", sol_urgency: "soon" };
  withLiveUrgency(input, now);
  assert.equal(input.sol_urgency, "soon");
});
