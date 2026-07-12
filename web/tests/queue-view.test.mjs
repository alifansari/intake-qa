// Pure view logic for the missed-cases queue (B-010 partition/sort, B-013
// elapsed-time urgency, B-011 attempt nudge). No I/O — these tests pin the
// persona rails: oldest-actionable first, terminal cards collapse, urgency is
// elapsed time only (never a statute date), nudges encourage and then stop.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TERMINAL_STATUSES,
  isTerminal,
  partitionLeaks,
  callUrgency,
  attemptNudge,
} from "../src/lib/desk/queue-view.mjs";

const DAY = 86_400_000;
const NOW = Date.parse("2026-07-11T18:00:00Z");
const ago = (days) => new Date(NOW - days * DAY).toISOString();

function leak(id, callDate, saveStatus = null) {
  return { id, callDate, saveStatus };
}

// ── B-010: partition + sort ───────────────────────────────────────────────────

test("terminal cards collapse into done; active stays active", () => {
  const { active, done } = partitionLeaks([
    leak(1, ago(1), "signed"),
    leak(2, ago(2), null),
    leak(3, ago(3), "didnt_sign"),
    leak(4, ago(4), "reached_out"),
    leak(5, ago(5), "bad_number"),
    leak(6, ago(6), "back_in_touch"),
    leak(7, ago(7), "needs_callback"),
  ]);
  assert.deepEqual(done.map((l) => l.id).sort(), [1, 3, 5]);
  assert.deepEqual(active.map((l) => l.id).sort(), [2, 4, 6, 7]);
});

test("active queue sorts oldest-actionable first — longest wait is the top card", () => {
  const { active } = partitionLeaks([
    leak("new", ago(0)),
    leak("oldest", ago(15)),
    leak("mid", ago(4)),
  ]);
  assert.deepEqual(active.map((l) => l.id), ["oldest", "mid", "new"]);
});

test("a day-15 queue of 30 stale cards stays a today's list: only the unworked ones surface", () => {
  // The week-3 survival scenario from the field guide: 30 cards, most handled.
  const cards = [];
  for (let i = 0; i < 30; i++) {
    const st = i % 3 === 0 ? null : i % 3 === 1 ? "signed" : "didnt_sign";
    cards.push(leak(i, ago(i % 15), st));
  }
  const { active, done } = partitionLeaks(cards);
  assert.equal(active.length, 10);
  assert.equal(done.length, 20);
  // And the active list is oldest-first, so day-15 opens on the longest-waiting caller.
  const waits = active.map((l) => NOW - Date.parse(l.callDate));
  assert.deepEqual(waits, [...waits].sort((a, b) => b - a));
});

test("unparseable/missing call dates don't crash the sort", () => {
  const { active } = partitionLeaks([leak(1, "not-a-date"), leak(2, ago(3)), leak(3, null)]);
  assert.equal(active.length, 3);
});

test("isTerminal matches the flag_status terminal set exactly", () => {
  assert.deepEqual([...TERMINAL_STATUSES].sort(), ["bad_number", "didnt_sign", "signed"]);
  for (const s of TERMINAL_STATUSES) assert.equal(isTerminal(s), true);
  for (const s of ["needs_callback", "reached_out", "back_in_touch", null, undefined, ""]) {
    assert.equal(isTerminal(s), false, `${s} must not be terminal`);
  }
});

// ── B-013: elapsed-time urgency (COMPLIANCE RAIL: no statute math, ever) ─────

test("urgency escalates with elapsed time: fresh -> aging -> urgent", () => {
  assert.equal(callUrgency(ago(0), NOW).tone, "fresh");
  assert.equal(callUrgency(ago(1), NOW).tone, "fresh");
  assert.equal(callUrgency(ago(2), NOW).tone, "aging");
  assert.equal(callUrgency(ago(6), NOW).tone, "aging");
  assert.equal(callUrgency(ago(7), NOW).tone, "urgent");
  assert.equal(callUrgency(ago(30), NOW).tone, "urgent");
});

test("urgency labels speak elapsed time and encouragement — never a deadline date", () => {
  for (const days of [0, 1, 3, 8, 21, 90]) {
    const u = callUrgency(ago(days), NOW);
    assert.ok(u.label.length > 0);
    // No statute language, no deadline, and no absolute date can appear:
    // "the firm's lawyer owns deadlines" is a compliance rail, not styling.
    assert.doesNotMatch(u.label.toLowerCase(), /statute|deadline|expires|runs out|file by|sol\b/);
    assert.doesNotMatch(u.label, /\b20\d\d\b|\d{1,2}\/\d{1,2}/, "no dates in the urgency label");
  }
});

test("urgency day counts are honest: elapsed days since the call", () => {
  assert.equal(callUrgency(ago(0), NOW).days, 0);
  assert.equal(callUrgency(ago(5), NOW).days, 5);
  assert.equal(callUrgency(ago(14), NOW).days, 14);
  // Clock skew / bad input never yields negative urgency.
  assert.equal(callUrgency(ago(-2), NOW).days, 0);
  assert.equal(callUrgency("garbage", NOW).days >= 0, true);
});

// ── B-011: attempt nudge (encouragement, never surveillance) ─────────────────

test("no nudge before the first logged attempt — the card itself is the prompt", () => {
  assert.equal(attemptNudge(0, "needs_callback"), null);
  assert.equal(attemptNudge(null, "needs_callback"), null);
});

test("attempts 1-2 legitimize the next try with the calls-3-to-6 science", () => {
  for (const n of [1, 2]) {
    const msg = attemptNudge(n, "reached_out");
    assert.match(msg, /3 and 6/);
    assert.match(msg, /worth another try/i);
  }
});

test("attempts 3-5 credit being in the range where cases sign", () => {
  for (const n of [3, 4, 5]) {
    const msg = attemptNudge(n, "reached_out");
    assert.match(msg, /calls 3–6/);
    assert.match(msg, /keep going/i);
  }
});

test("attempt 6+ credits a full effort and hands judgment back — no guilt", () => {
  for (const n of [6, 9]) {
    const msg = attemptNudge(n, "reached_out");
    assert.match(msg, /full effort/i);
    assert.match(msg, /your judgment/i);
  }
});

test("nudges never read as surveillance — no 'only', no 'must', no quota framing", () => {
  for (let n = 1; n <= 8; n++) {
    const msg = attemptNudge(n, "reached_out") ?? "";
    assert.doesNotMatch(msg.toLowerCase(), /\bonly\b|\bmust\b|\brequired\b|\bbehind\b|\bfailed\b/);
  }
});

test("nudging stops on terminal outcomes — the stopping rule is respected", () => {
  for (const s of ["signed", "didnt_sign", "bad_number"]) {
    assert.equal(attemptNudge(4, s), null, `no nudge once ${s}`);
  }
});
