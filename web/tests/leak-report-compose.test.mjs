// Composition-layer tests (Stage 3): the hard content rules that make the report
// trustworthy. Pure; no I/O; uses the demo fixture + synthetic edge cases.

import { test } from "node:test";
import assert from "node:assert/strict";
import { composeLeakReport, lintNoStaffNames, badgeFor } from "../src/lib/leak-report/compose.mjs";
import { LEAK_TAG_KEYS } from "../analysis/leak-taxonomy.mjs";

// The demo fixture is TypeScript (node --test can't parse it), so this rebuilds an
// equivalent plain-JS fixture for the pure-logic tests.
const base = {
  firmName: "Test Firm (DEMO)",
  firmCode: "TEST",
  periodLabel: "June 2026",
  issuedDate: "2026-07-05",
  seq: 1,
  year: 2026,
  reconciliation: { received: 100, processed: 96, excluded: 3, failed: 1 },
  couldNotDetermine: ["Whether a PNC called back on another line."],
  analystNote: "No callback protocol existed for after-hours calls; that is a process gap.",
  leaks: [
    { callerInitials: "J.R.", callerId: "#A-1", callDate: "2026-06-08", caseType: "Auto — rear-end",
      qualifyingFacts: [{ text: "Rear-ended; treating", cite: "[03:12]" }],
      feeLowCents: 600000, feeHighCents: 1500000, statuteDays: 690, saveStatus: "Sent by staff",
      confidence: "strong", channel: "Answering service", severity: "significant", tag: "no-callback-commitment",
      excerpt: "Caller: I want to move forward.\nStaff: Someone will call you back." },
    { callerInitials: "M.E.", callerId: "#A-2", callDate: "2026-06-15", caseType: "Slip & fall",
      qualifyingFacts: [{ text: "Fractured wrist; incident report filed", cite: "[04:33]" }],
      feeLowCents: 500000, feeHighCents: 1600000, statuteDays: 22, saveStatus: "Draft ready",
      confidence: "strong", channel: "Staff (business hours)", severity: "critical", tag: "language-mismatch" },
    { callerInitials: "T.W.", callerId: "#A-3", callDate: "2026-06-22", caseType: "Dog bite",
      qualifyingFacts: [{ text: "ER treated", cite: "[01:48]" }],
      feeLowCents: 260000, feeHighCents: 1000000, statuteDays: 705, saveStatus: "Contact resumed",
      confidence: "moderate", channel: "AI receptionist", severity: "significant", tag: "quote-only-no-close" },
    { callerInitials: "D.O.", callerId: "#A-4", callDate: "2024-05-02", caseType: "Auto — rear-end",
      qualifyingFacts: [{ text: "Fee concern never addressed", cite: "[04:18]" }],
      feeLowCents: 1200000, feeHighCents: 3000000, statuteDays: 0, statuteExpired: true, saveStatus: "Statute lapsed",
      confidence: "strong", channel: "Answering service", severity: "awareness", tag: "unhandled-objection" },
  ],
};

test("page-one numbers count ONLY strong, non-expired flags", () => {
  const m = composeLeakReport(base);
  // 2 strong non-expired (J.R., M.E.); T.W. moderate excluded; D.O. strong-but-expired excluded.
  assert.equal(m.pageOne.count, 2);
  assert.equal(m.pageOne.recoverable, 2);
});

test("all-moderate session composes without crashing (regression: mostUrgent undefined)", () => {
  // A real session can have leaked-but-moderate calls only (signability 60-74),
  // so `strong`/`exhibits` are empty while `leaks` is not. This used to throw a
  // TypeError (mostUrgent.displayId) → 500 on the leak-report route.
  const allModerate = {
    ...base,
    leaks: base.leaks
      .filter((l) => !l.statuteExpired)
      .map((l) => ({ ...l, confidence: "moderate" })),
  };
  const m = composeLeakReport(allModerate);
  assert.equal(m.pageOne.count, 0); // no strong rows counted
  assert.equal(m.pageOne.feeLowCents, 0);
  assert.deepEqual(m.pageOne.threeActions, []); // null-guarded, no crash
  assert.equal(m.coverMemo, null);
  assert.equal(m.pageOne.nextAction, null);
});

test("headline fee low equals the arithmetic sum of the shown strong rows", () => {
  const m = composeLeakReport(base);
  assert.equal(m.schedule.headlineLow, 600000 + 500000); // $11,000
  assert.equal(m.schedule.rows.length, 2);
});

test("expired case never appears in headline; shown only in exclusions as 'statute expired'", () => {
  const m = composeLeakReport(base);
  assert.ok(!m.schedule.rows.some((r) => r.caseType === "Auto — rear-end" && r.feeRange.includes("30,000")));
  const expiredExclusion = m.schedule.exclusions.find((x) => x.reason === "statute expired");
  assert.ok(expiredExclusion, "expired case listed in exclusions");
  // total flagged = 4, counted = 2 (the auditor's-scope move)
  assert.match(m.schedule.exclusionsIntro, /We found 4 flagged cases\. We count 2/);
});

test("moderate flags are excluded from totals and listed in exclusions", () => {
  const m = composeLeakReport(base);
  const modExclusion = m.schedule.exclusions.find((x) => x.reason.startsWith("moderate confidence"));
  assert.ok(modExclusion);
});

test("cover memo is generated because a case is in the CRITICAL band (22 days)", () => {
  const m = composeLeakReport(base);
  assert.ok(m.coverMemo && m.coverMemo.includes("TIME-SENSITIVE"));
});

test("badges map from sol.mjs bands to CRITICAL/SOON/OK/EXPIRED", () => {
  assert.equal(badgeFor({ statuteDays: 22 }), "CRITICAL");
  assert.equal(badgeFor({ statuteDays: 60 }), "SOON");
  assert.equal(badgeFor({ statuteDays: 400 }), "OK");
  assert.equal(badgeFor({ statuteExpired: true, statuteDays: 0 }), "EXPIRED");
});

test("every exhibit carries the mandatory SOL disclaimer", () => {
  const m = composeLeakReport(base);
  assert.ok(m.exhibits.length > 0);
  assert.ok(m.exhibits.every((e) => /attorney must independently verify/.test(e.disclaimer)));
});

test("system-not-person lint blocks a staff name in findings", () => {
  assert.throws(() => lintNoStaffNames(["Maria failed to return the call"]), /system-not-person/);
  const withBlame = { ...base, analystNote: "Maria forgot to schedule the callback." };
  assert.throws(() => composeLeakReport(withBlame), /system-not-person/);
});

test("taxonomy: invalid tag fails composition; the 7 keys are the canonical set", () => {
  assert.equal(LEAK_TAG_KEYS.length, 7);
  const bad = { ...base, leaks: [{ ...base.leaks[0], tag: "made-up-tag" }] };
  assert.throws(() => composeLeakReport(bad), /taxonomy|invalid tag/);
});
