// Pure unit tests for the approval-queue SLA helpers. No DB, no network — the
// stale/age math must be deterministic so the queue badge and the daily digest
// agree on what "overdue" means.

import { test } from "node:test";
import assert from "node:assert/strict";
import { draftSla, ageLabel, countStale, STALE_DRAFT_HOURS } from "../messaging/sla.mjs";

const NOW = new Date("2025-01-15T12:00:00Z");
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

test("draftSla: fresh draft is not stale, stamps a short label", () => {
  const s = draftSla(hoursAgo(2), NOW);
  assert.equal(s.stale, false);
  assert.equal(s.label, "2h");
  assert.ok(Math.abs(s.hours - 2) < 1e-9);
});

test("draftSla: at the threshold it becomes stale", () => {
  assert.equal(draftSla(hoursAgo(STALE_DRAFT_HOURS - 0.01), NOW).stale, false);
  assert.equal(draftSla(hoursAgo(STALE_DRAFT_HOURS), NOW).stale, true);
  assert.equal(draftSla(hoursAgo(48), NOW).stale, true);
});

test("ageLabel: minutes, hours, days", () => {
  assert.equal(ageLabel(0), "just now");
  assert.equal(ageLabel(42 * 60_000), "42m");
  assert.equal(ageLabel(3 * 3_600_000), "3h");
  assert.equal(ageLabel(50 * 3_600_000), "2d");
});

test("draftSla: bad/negative inputs never throw and never go negative", () => {
  assert.equal(draftSla("not-a-date", NOW).ms, 0);
  assert.equal(draftSla(new Date(NOW.getTime() + 5000).toISOString(), NOW).ms, 0);
});

test("countStale counts only overdue drafts", () => {
  const drafts = [
    { created_at: hoursAgo(1) },
    { created_at: hoursAgo(13) },
    { created_at: hoursAgo(30) },
  ];
  assert.equal(countStale(drafts, NOW), 2);
});
