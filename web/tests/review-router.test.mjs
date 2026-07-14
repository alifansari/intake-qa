// Risk-based review router (analyst-facing triage). Pure classifier; no I/O.
//
// Verifies the decision rule (force_review vs auto_eligible), the human-readable
// reasons, and the priorityScore ordering the review queue sorts on. This is
// triage metadata only — nothing here releases a report (see review-router.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyForReview, DEFAULT_THRESHOLDS, formatDollars, provenanceForFlag } from "../analysis/review-router.mjs";

const STRONG_CLEAN_LOW = {
  worstConfidenceTier: "strong",
  citationFailureCount: 0,
  maxRevenueAtRiskCents: 250_000, // $2,500 — under the $10k line
};

test("strong + clean + low-$ is auto_eligible", () => {
  const r = classifyForReview(STRONG_CLEAN_LOW);
  assert.equal(r.decision, "auto_eligible");
  assert.ok(r.reasons.includes("Low risk"));
  // Below the FORCE_BASE floor that every force_review row sits above.
  assert.ok(r.priorityScore < DEFAULT_THRESHOLDS.FORCE_BASE);
});

test("moderate confidence forces review", () => {
  const r = classifyForReview({ ...STRONG_CLEAN_LOW, worstConfidenceTier: "moderate" });
  assert.equal(r.decision, "force_review");
  assert.ok(r.reasons.includes("Low confidence"));
});

test("null/unknown confidence forces review and is labeled 'unrated'", () => {
  const r = classifyForReview({ ...STRONG_CLEAN_LOW, worstConfidenceTier: null });
  assert.equal(r.decision, "force_review");
  assert.ok(r.reasons.includes("Confidence unrated"));
});

test("any citation failure forces review", () => {
  const r = classifyForReview({ ...STRONG_CLEAN_LOW, citationFailureCount: 1 });
  assert.equal(r.decision, "force_review");
  assert.ok(r.reasons.includes("Citation gap"));
  const many = classifyForReview({ ...STRONG_CLEAN_LOW, citationFailureCount: 3 });
  assert.ok(many.reasons.includes("Citation gap (3)"));
});

test("high-$ even with strong confidence forces review", () => {
  const r = classifyForReview({
    worstConfidenceTier: "strong",
    citationFailureCount: 0,
    maxRevenueAtRiskCents: 1_200_000, // $12k >= $10k line
  });
  assert.equal(r.decision, "force_review");
  assert.ok(r.reasons.some((x) => x.startsWith("High value")));
  assert.ok(r.reasons.includes("High value: $12k"));
});

test("dollar force line is overridable via thresholds", () => {
  const base = { worstConfidenceTier: "strong", citationFailureCount: 0, maxRevenueAtRiskCents: 600_000 };
  assert.equal(classifyForReview(base).decision, "auto_eligible"); // $6k < $10k default
  const lowered = classifyForReview({ ...base, thresholds: { FORCE_DOLLARS_CENTS: 500_000 } });
  assert.equal(lowered.decision, "force_review"); // $6k >= $5k override
});

test("priorityScore: higher $ sorts sooner within the same decision", () => {
  const hi = classifyForReview({ worstConfidenceTier: "strong", maxRevenueAtRiskCents: 900_000 });
  const lo = classifyForReview({ worstConfidenceTier: "strong", maxRevenueAtRiskCents: 100_000 });
  assert.equal(hi.decision, "auto_eligible");
  assert.equal(lo.decision, "auto_eligible");
  assert.ok(hi.priorityScore > lo.priorityScore);
});

test("priorityScore: every force_review sorts above every auto_eligible", () => {
  // A low-$ force_review must still outrank a high-$ auto_eligible in one sort.
  const forceLow = classifyForReview({ worstConfidenceTier: "moderate", maxRevenueAtRiskCents: 0 });
  const autoHigh = classifyForReview({ worstConfidenceTier: "strong", maxRevenueAtRiskCents: 990_000 });
  assert.equal(forceLow.decision, "force_review");
  assert.equal(autoHigh.decision, "auto_eligible");
  assert.ok(forceLow.priorityScore > autoHigh.priorityScore);

  // Sorting a mixed list by priorityScore desc groups force ahead of auto.
  const rows = [autoHigh, forceLow].sort((a, b) => b.priorityScore - a.priorityScore);
  assert.equal(rows[0].decision, "force_review");
  assert.equal(rows[1].decision, "auto_eligible");
});

test("priorityScore is deterministic and monotonic in citation failures", () => {
  const a = classifyForReview({ worstConfidenceTier: "strong", citationFailureCount: 1, maxRevenueAtRiskCents: 0 });
  const b = classifyForReview({ worstConfidenceTier: "strong", citationFailureCount: 2, maxRevenueAtRiskCents: 0 });
  assert.equal(a.priorityScore, classifyForReview({ worstConfidenceTier: "strong", citationFailureCount: 1, maxRevenueAtRiskCents: 0 }).priorityScore);
  assert.ok(b.priorityScore > a.priorityScore);
});

test("formatDollars renders compact money", () => {
  assert.equal(formatDollars(1_200_000), "$12k");
  assert.equal(formatDollars(1_234_000), "$12.3k");
  assert.equal(formatDollars(80_000), "$800");
});

test("provenanceForFlag: strong + cited + low-$ is engine_scored", () => {
  assert.equal(provenanceForFlag({ tier: "strong", citationCount: 2, revenueCents: 250_000 }), "engine_scored");
});

test("provenanceForFlag: any risk signal forces analyst_reviewed", () => {
  // moderate tier
  assert.equal(provenanceForFlag({ tier: "moderate", citationCount: 2, revenueCents: 250_000 }), "analyst_reviewed");
  // no citation on record (citation gap) even when strong + low-$
  assert.equal(provenanceForFlag({ tier: "strong", citationCount: 0, revenueCents: 250_000 }), "analyst_reviewed");
  // high value even when strong + cited
  assert.equal(provenanceForFlag({ tier: "strong", citationCount: 2, revenueCents: 1_200_000 }), "analyst_reviewed");
  // unrated tier
  assert.equal(provenanceForFlag({ tier: null, citationCount: 2, revenueCents: 250_000 }), "analyst_reviewed");
});

test("provenanceForFlag: missing input defaults to analyst_reviewed (fail safe)", () => {
  assert.equal(provenanceForFlag(), "analyst_reviewed");
  assert.equal(provenanceForFlag({}), "analyst_reviewed");
});

test("dirty inputs are coerced, never throw", () => {
  const r = classifyForReview({
    worstConfidenceTier: "bogus",
    citationFailureCount: -4,
    maxRevenueAtRiskCents: NaN,
  });
  assert.equal(r.decision, "force_review"); // unknown tier => not strong => force
  assert.ok(Number.isFinite(r.priorityScore));
});
