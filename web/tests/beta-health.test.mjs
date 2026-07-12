// Tests for the pure beta-health logic behind /studio/beta: the 48h activation
// clock (BETA_ONBOARDING.md's one metric), the unopened-digest streak ("three
// consecutive unopened digests = call the firm"), the defensive digest.run
// ledger parser, and the funnel arithmetic (ops/insights.md B1/B2). Pure
// functions, no I/O, no DB.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  activationState,
  unopenedStreak,
  parseDigestRunOutcomes,
  digestOutcomeLabel,
  funnel,
  UNOPENED_STREAK_CALL_THRESHOLD,
} from "../src/lib/beta/health.mjs";

const T0 = new Date("2026-07-10T12:00:00Z");
const hours = (n) => new Date(T0.getTime() + n * 3600_000).toISOString();

// --- activationState -----------------------------------------------------------

test("activation: no digest/miss yet → waiting", () => {
  assert.deepEqual(activationState({ now: T0 }), { state: "waiting" });
  assert.deepEqual(activationState({ firstDigestAt: "garbage", now: T0 }), { state: "waiting" });
});

test("activation: clock running shows hours left, then flips to missed", () => {
  const started = activationState({ firstDigestAt: hours(-10), now: T0 });
  assert.equal(started.state, "on_clock");
  assert.equal(started.hoursLeft, 38); // 48 - 10

  const lastMinute = activationState({ firstDigestAt: hours(-47.5), now: T0 });
  assert.equal(lastMinute.state, "on_clock");
  assert.equal(lastMinute.hoursLeft, 1);

  const expired = activationState({ firstDigestAt: hours(-49), now: T0 });
  assert.equal(expired.state, "missed");
  assert.equal(expired.actedLate, undefined);
});

test("activation: callback inside the window activates, with time-to-activate", () => {
  const a = activationState({
    firstDigestAt: hours(-30),
    firstCallbackAt: hours(-25),
    now: T0,
  });
  assert.equal(a.state, "activated");
  assert.equal(a.hoursToActivate, 5);
});

test("activation: callback after the window is missed (acted late), honestly", () => {
  const a = activationState({
    firstDigestAt: hours(-100),
    firstCallbackAt: hours(-10),
    now: T0,
  });
  assert.equal(a.state, "missed");
  assert.equal(a.actedLate, true);
});

// --- unopenedStreak --------------------------------------------------------------

test("streak: no sends → zero, never call-the-firm", () => {
  const s = unopenedStreak({ sends: [], opens: [] });
  assert.equal(s.streak, 0);
  assert.equal(s.callTheFirm, false);
});

test("streak: three consecutive unopened digests trips the call-the-firm flag", () => {
  const sends = [1, 2, 3].map((d) => ({ created_at: hours(-24 * d) }));
  const s = unopenedStreak({ sends, opens: [] });
  assert.equal(s.streak, 3);
  assert.equal(s.callTheFirm, true);
  assert.equal(UNOPENED_STREAK_CALL_THRESHOLD, 3);
});

test("streak: an open resets everything sent before it", () => {
  const sends = [
    { created_at: hours(-72) },
    { created_at: hours(-48) },
    { created_at: hours(-24) },
  ];
  // Opened after the middle send: only the newest digest counts as unopened.
  const opens = [{ created_at: hours(-40) }];
  const s = unopenedStreak({ sends, opens });
  assert.equal(s.streak, 1);
  assert.equal(s.callTheFirm, false);

  // Opened after the newest send → streak 0.
  const s2 = unopenedStreak({ sends, opens: [{ created_at: hours(-1) }] });
  assert.equal(s2.streak, 0);
});

// --- parseDigestRunOutcomes -------------------------------------------------------

test("digest.run parser: newest run row wins, per-firm outcomes keyed by id", () => {
  const rows = [
    { source: "other.thing", message: "noise", context: null },
    {
      source: "digest.run",
      message: "digest run: 2 firm(s) — 1 emailed, 0 rendered-to-file, 1 skipped, 0 failed",
      created_at: "2026-07-10T15:00:00Z",
      context: JSON.stringify({
        results: [
          { firm: "f1", mode: "live", missCount: 2 },
          { firm: "f2", mode: "skipped", reason: "no recipients" },
        ],
      }),
    },
  ];
  const parsed = parseDigestRunOutcomes(rows);
  assert.ok(parsed);
  assert.equal(parsed.byFirm.f1.mode, "live");
  assert.equal(parsed.byFirm.f2.reason, "no recipients");
  assert.equal(digestOutcomeLabel(parsed.byFirm.f1), "emailed");
  assert.equal(digestOutcomeLabel(parsed.byFirm.f2), "skipped — no recipients");
  assert.equal(digestOutcomeLabel(null), "no digest run yet");
});

test("digest.run parser: malformed context never throws, returns null", () => {
  assert.equal(parseDigestRunOutcomes([{ source: "digest.run", context: "{not json" }]), null);
  assert.equal(parseDigestRunOutcomes([]), null);
  assert.equal(parseDigestRunOutcomes(null), null);
});

// --- funnel -----------------------------------------------------------------------

test("funnel: percentages guard division by zero", () => {
  assert.deepEqual(funnel({ audits: 0, pilots: 0, paid: 0 }), {
    audits: 0,
    pilots: 0,
    paid: 0,
    auditToPilotPct: null,
    pilotToPaidPct: null,
  });
  const f = funnel({ audits: 10, pilots: 4, paid: 2 });
  assert.equal(f.auditToPilotPct, 40);
  assert.equal(f.pilotToPaidPct, 50);
});
