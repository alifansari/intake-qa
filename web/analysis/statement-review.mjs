// Firm-statement release logic (tiered / sampled review) — PURE, testable.
//
// Given the REAL per-flag signals for one firm+period's leaked flags, decide the
// Monthly Missed-Revenue Statement's review status:
//
//   * ANY flag force_review  -> status 'analyst_review' (a human must sign off).
//     provenance stays NULL until the analyst releases it (then 'analyst_reviewed').
//   * EVERY flag auto_eligible -> auto-release via report-status.mjs, status
//     'released', provenance 'engine_scored' (calibrated engine + citation guard).
//   * No leaked flags at all  -> nothing to release; stays 'draft'.
//
// INVARIANT (§IV): a statement is NEVER released while a force_review flag is
// unreviewed. force_review is triggered by moderate/unrated confidence, ANY real
// citation-guard failure, or a high dollar figure — so the auto path only ever
// carries strong-confidence, evidence-verified, low-stakes findings.
//
// The DECISION to use this at all is the caller's, gated by SAMPLED_REVIEW_ENABLED
// (default OFF). This module never reads the flag and never touches I/O.

import { classifyForReview } from "./review-router.mjs";
import { autoReleaseReport } from "./report-status.mjs";

/**
 * @param {object} input
 * @param {Array<{ confidenceTier?: ('strong'|'moderate'|null), citationFailureCount?: number, revenueAtRiskCents?: number }>} input.perFlag
 *   Per-flag real signals (as produced by reduceFirmStatementSignals).
 * @param {object} [input.thresholds] Overrides forwarded to classifyForReview.
 * @returns {{ reportStatus: ('draft'|'analyst_review'|'released'), provenance: ('analyst_reviewed'|'engine_scored'|null), autoCount: number, forceReviewCount: number }}
 */
export function decideStatementReview({ perFlag = [], thresholds } = {}) {
  let autoCount = 0;
  let forceReviewCount = 0;

  // Classify each flag directly from its OWN real signals — independent of any
  // provenance label the caller may have attached, so this stays self-contained
  // and testable. It agrees with reduceFirmStatementSignals because both use
  // the same classifier.
  for (const pf of perFlag ?? []) {
    const { decision } = classifyForReview({
      worstConfidenceTier: pf.confidenceTier,
      citationFailureCount: pf.citationFailureCount ?? 0,
      maxRevenueAtRiskCents: pf.revenueAtRiskCents ?? 0,
      thresholds,
    });
    if (decision === "force_review") forceReviewCount += 1;
    else autoCount += 1;
  }

  // No leaked flags → nothing to release. Stays draft.
  if ((perFlag ?? []).length === 0) {
    return { reportStatus: "draft", provenance: null, autoCount: 0, forceReviewCount: 0 };
  }

  // Any force_review flag → the whole statement needs a human. Provenance stays
  // null (unearned) until the analyst signs off through the checklist path.
  if (forceReviewCount > 0) {
    return { reportStatus: "analyst_review", provenance: null, autoCount, forceReviewCount };
  }

  // Every flag auto_eligible → auto-release through the report-status machine.
  // autoReleaseReport validates the analyst_review -> released move and stamps the
  // engine_scored provenance; a force_review flag can never reach this branch.
  const { status, provenance } = autoReleaseReport({ from: "analyst_review" });
  return { reportStatus: status, provenance, autoCount, forceReviewCount };
}
