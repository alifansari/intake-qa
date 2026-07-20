// Pure view helpers for the live-triage desk. Focused on B-026's deadlineWatch
// (the safety-net panel's filing-deadline aggregate) plus a sort/tone sanity.

import { test } from "node:test";
import assert from "node:assert/strict";

import { deadlineWatch, triageQueueSort, solTone } from "../src/lib/desk/triage-view.mjs";

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
