// Risk-based review router (analyst-facing efficiency ONLY).
//
// PURPOSE: today an analyst reviews 100% of reports before release (see
// analysis/report-status.mjs: draft -> analyst_review -> released, gated by the
// pre-release checklist). This module does NOT change that gate and does NOT
// auto-release anything. It only CLASSIFIES a report for triage so the review
// queue can surface the highest-leverage items first.
//
// PURE / I-O-FREE by design (no "server-only", no db handle) so it is unit
// testable and identical for SQLite now and Postgres later. It consumes signals
// that already persist elsewhere — it never recomputes scoring.
//
// COMPLIANCE:
//  - §IV (no citation, no claim): a citation-guard failure or a non-"strong"
//    confidence tier can only PUSH a report toward more human review, never away
//    from it. There is no path here that releases or hides anything.
//  - The classifier is deliberately conservative: anything short of
//    "strong + clean + under the dollar line" is forced to human review. The
//    "auto_eligible" label is advisory triage metadata ONLY; a separately
//    approved step (not built here) would be needed before it could ever skip a
//    human. Nothing in this file releases a report.

// Read the force-review dollar line from env if present (cents), else $10k.
function forceDollarsFromEnv() {
  const raw = process.env.REVIEW_FORCE_DOLLARS_CENTS;
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1_000_000; // $10,000
}

// Tunable, overridable per call. FORCE_BASE is a large constant added to every
// force_review priorityScore so a single `sort by priorityScore desc` keeps every
// force_review row above every auto_eligible row while still ordering by dollars
// within each group.
export const DEFAULT_THRESHOLDS = Object.freeze({
  FORCE_DOLLARS_CENTS: forceDollarsFromEnv(), // >= this revenue-at-risk forces review
  DOLLAR_FULL_WEIGHT_CENTS: 2_000_000, // $20k saturates the normalized dollar term at 1.0
  MODERATE_CONFIDENCE_BUMP: 0.5, // priority bump when confidence is not "strong"
  CITATION_FAILURE_BUMP: 0.75, // priority bump per citation-guard failure
  FORCE_BASE: 1000, // keeps force_review above auto_eligible under one desc sort
});

// Coerce a possibly-dirty count/amount to a non-negative finite number.
function nonNeg(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

// Only "strong" | "moderate" are meaningful tiers (the flag_confidence CHECK
// constraint's legal values). Anything else (null/unknown/unrated) is treated as
// NOT strong — i.e. it forces review — but is labeled distinctly so the badge is
// honest about "we have no tier" vs "the tier is moderate".
function normalizeTier(t) {
  return t === "strong" || t === "moderate" ? t : null;
}

// Compact money for the human-readable reason ("$12k", "$12.3k", "$800").
export function formatDollars(cents) {
  const dollars = Math.round(nonNeg(cents) / 100);
  if (dollars >= 1000) {
    const k = dollars / 1000;
    return `$${Number.isInteger(k) ? String(k) : k.toFixed(1)}k`;
  }
  return `$${dollars.toLocaleString("en-US")}`;
}

/**
 * Classify one report/session for analyst review.
 *
 * @param {object} input
 * @param {('strong'|'moderate'|null|undefined)} input.worstConfidenceTier
 *   The WORST per-flag confidence tier across the session (moderate beats strong;
 *   null/unknown = no tier recorded).
 * @param {number} [input.citationFailureCount] Count of citation-guard failures
 *   across the session (any > 0 = an uncited claim was dropped for some flag).
 * @param {number} [input.maxRevenueAtRiskCents] Max revenue-at-risk across the
 *   session's calls, in cents.
 * @param {object} [input.thresholds] Overrides merged over DEFAULT_THRESHOLDS.
 * @returns {{ decision: 'force_review'|'auto_eligible', reasons: string[], priorityScore: number }}
 */
export function classifyForReview({
  worstConfidenceTier,
  citationFailureCount = 0,
  maxRevenueAtRiskCents = 0,
  thresholds,
} = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const tier = normalizeTier(worstConfidenceTier);
  const failures = Math.floor(nonNeg(citationFailureCount));
  const cents = nonNeg(maxRevenueAtRiskCents);

  const lowConfidence = tier !== "strong";
  const hasCitationGap = failures > 0;
  const highValue = cents >= t.FORCE_DOLLARS_CENTS;

  const decision = lowConfidence || hasCitationGap || highValue ? "force_review" : "auto_eligible";

  const reasons = [];
  if (highValue) reasons.push(`High value: ${formatDollars(cents)}`);
  if (hasCitationGap) reasons.push(failures > 1 ? `Citation gap (${failures})` : "Citation gap");
  if (tier === "moderate") reasons.push("Low confidence");
  else if (tier === null) reasons.push("Confidence unrated");
  if (decision === "auto_eligible") reasons.push("Low risk");

  // priorityScore — higher = review sooner. Deterministic.
  const normDollars = Math.min(cents / t.DOLLAR_FULL_WEIGHT_CENTS, 1);
  let priorityScore = normDollars;
  if (lowConfidence) priorityScore += t.MODERATE_CONFIDENCE_BUMP;
  priorityScore += failures * t.CITATION_FAILURE_BUMP;
  if (decision === "force_review") priorityScore += t.FORCE_BASE;

  return { decision, reasons, priorityScore: Number(priorityScore.toFixed(4)) };
}

/**
 * Firm-facing provenance for ONE pipeline flag, derived from that flag's OWN
 * signals via the same classifier. Reuses classifyForReview so the badge can
 * never disagree with the review decision.
 *
 * Signal mapping for a firm flag (real signals available on the desk pipeline —
 * `flags.confidence_tier`, `flags.citation_count`, and the fee-value range):
 *  - worstConfidenceTier <- tier
 *  - maxRevenueAtRiskCents <- revenueCents (use the high end to be conservative)
 *  - citationFailureCount <- 0 when the flag carries at least one citation, else 1.
 *    A flag with NO citation on record is treated as a citation gap and forced to
 *    analyst review — the citation guard is the universal floor (§IV); provenance
 *    can only ever be pushed TOWARD "analyst_reviewed", never away from it.
 *
 * @param {{ tier?: ('strong'|'moderate'|null), citationCount?: number, revenueCents?: number, thresholds?: object }} [input]
 * @returns {'analyst_reviewed'|'engine_scored'}
 */
export function provenanceForFlag({ tier, citationCount = 0, revenueCents = 0, thresholds } = {}) {
  const { decision } = classifyForReview({
    worstConfidenceTier: tier,
    citationFailureCount: nonNeg(citationCount) > 0 ? 0 : 1,
    maxRevenueAtRiskCents: revenueCents,
    thresholds,
  });
  return decision === "force_review" ? "analyst_reviewed" : "engine_scored";
}

/**
 * Inclusive-start / exclusive-end ISO window for a 'YYYY-MM' period. PURE. Shared
 * by both db twins so the firm-statement signal query filters an identical window
 * (and by any caller that needs the same month boundaries). Returns null on a
 * malformed period so callers can fail closed.
 *
 * @param {string} period 'YYYY-MM'
 * @returns {{ start: string, endExclusive: string } | null}
 */
export function firmStatementPeriodWindow(period) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(period ?? ""));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (month < 1 || month > 12) return null;
  const start = `${m[1]}-${m[2]}-01T00:00:00.000Z`;
  const endExclusive = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)).toISOString();
  return { start, endExclusive };
}

/**
 * Reduce the REAL per-flag signal rows for one firm+period into the shape the
 * firm-statement release logic consumes. PURE / I-O-FREE — the db twins run the
 * query and hand the raw rows here, so SQLite and Postgres cannot drift.
 *
 * Each raw row carries a flag's OWN real signals: confidence_tier (from
 * flag_confidence — 'strong' is only earned WITH a passing citation), the real
 * COUNT of citation_failures for that flag (the §IV floor — never a hard-coded 0),
 * and revenue_at_risk_cents (from call_analyses). Per-flag provenance comes from
 * classifyForReview, so a flag can only ever be pushed TOWARD analyst review, never
 * away from it (moderate/unrated tier, any citation failure, or high dollars all
 * force review).
 *
 * @param {Array<{ flag_id?: unknown, flagId?: unknown, confidence_tier?: string, confidenceTier?: string, citation_failure_count?: number, citationFailureCount?: number, revenue_at_risk_cents?: number, revenueAtRiskCents?: number }>} rawFlags
 * @param {{ thresholds?: object }} [opts]
 * @returns {{ worstConfidenceTier: ('strong'|'moderate'|null), citationFailureCount: number, maxRevenueAtRiskCents: number, perFlag: Array<{ flagId: unknown, confidenceTier: ('strong'|'moderate'|null), citationFailureCount: number, revenueAtRiskCents: number, provenance: ('analyst_reviewed'|'engine_scored') }> }}
 */
export function reduceFirmStatementSignals(rawFlags, { thresholds } = {}) {
  let worstConfidenceTier = null;
  let citationFailureCount = 0;
  let maxRevenueAtRiskCents = 0;
  const perFlag = [];
  for (const row of rawFlags ?? []) {
    const tier = normalizeTier(row.confidence_tier ?? row.confidenceTier);
    const failures = Math.floor(nonNeg(row.citation_failure_count ?? row.citationFailureCount));
    const cents = nonNeg(row.revenue_at_risk_cents ?? row.revenueAtRiskCents);
    const flagId = row.flag_id ?? row.flagId ?? null;

    if (tier === "moderate") worstConfidenceTier = "moderate";
    else if (tier === "strong" && worstConfidenceTier !== "moderate") worstConfidenceTier = "strong";
    citationFailureCount += failures;
    if (cents > maxRevenueAtRiskCents) maxRevenueAtRiskCents = cents;

    const { decision } = classifyForReview({
      worstConfidenceTier: tier,
      citationFailureCount: failures,
      maxRevenueAtRiskCents: cents,
      thresholds,
    });
    perFlag.push({
      flagId,
      confidenceTier: tier,
      citationFailureCount: failures,
      revenueAtRiskCents: cents,
      provenance: decision === "force_review" ? "analyst_reviewed" : "engine_scored",
    });
  }
  return { worstConfidenceTier, citationFailureCount, maxRevenueAtRiskCents, perFlag };
}
