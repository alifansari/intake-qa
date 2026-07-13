import type { CallMeta, Outcome, OutcomeCode, ScoredCall } from "./schema";

// ---------------------------------------------------------------------------
// The reconciliation domain model. A ReconciledCall joins the scoring-engine
// output, its sidecar metadata, and the human-entered outcome, then derives the
// verdict and the fields the dashboard reasons about.
// ---------------------------------------------------------------------------

export type ScoreBand = "0-39" | "40-59" | "60-79" | "80-100";

export const SCORE_BANDS: ScoreBand[] = ["0-39", "40-59", "60-79", "80-100"];

// Editorial band labels, matching the scoring engine’s own language.
export const BAND_LABEL: Record<ScoreBand, string> = {
  "0-39": "Intervention",
  "40-59": "Needs coaching",
  "60-79": "Developing",
  "80-100": "Strong",
};

export type Verdict =
  | "correct_flag" // flagged + signed_elsewhere (true positive)
  | "correct_flag_recovered" // flagged + signed_us_after_callback (recovered TP)
  | "false_alarm" // flagged + not_signable_disqualified (false positive)
  | "missed_catch" // not flagged + signed_elsewhere (false negative)
  | "correct_pass" // not flagged + {disqualified, no_representation} (true negative)
  | "excluded"; // unknown/still_open/unreachable — no ground truth yet

export interface ReconciledCall {
  call: ScoredCall;
  meta: CallMeta;
  outcome: Outcome;
  flagged: boolean;
  feeAtRisk: number; // alerts.revenue_at_risk.amount_usd, or 0
  overall: number;
  confidence: "high" | "medium" | "low" | "unknown";
  band: ScoreBand;
  verdict: Verdict;
}

export function scoreBand(overall: number): ScoreBand {
  if (overall < 40) return "0-39";
  if (overall < 60) return "40-59";
  if (overall < 80) return "60-79";
  return "80-100";
}

export function isFlagged(call: ScoredCall): boolean {
  return call.alerts?.lost_signable_case === true;
}

export function feeAtRisk(call: ScoredCall): number {
  return call.alerts?.revenue_at_risk?.amount_usd ?? 0;
}

const SIGNED_CODES: OutcomeCode[] = [
  "signed_us_first_call",
  "signed_us_after_callback",
  "signed_elsewhere",
];
const RESOLVED_EXCLUDED: OutcomeCode[] = ["unknown", "still_open", "unreachable"];

export function isSigned(code: OutcomeCode): boolean {
  return SIGNED_CODES.includes(code);
}

// A call is "resolved" (has usable ground truth) unless its outcome is still
// pending. Excluded outcomes are counted separately, never in calibration math.
export function isResolved(code: OutcomeCode): boolean {
  return !RESOLVED_EXCLUDED.includes(code);
}

// The exact verdict table from the spec.
export function deriveVerdict(flagged: boolean, code: OutcomeCode): Verdict {
  if (RESOLVED_EXCLUDED.includes(code)) return "excluded";
  if (flagged) {
    if (code === "signed_elsewhere") return "correct_flag";
    if (code === "signed_us_after_callback") return "correct_flag_recovered";
    if (code === "not_signable_disqualified") return "false_alarm";
    return "excluded"; // flagged but signed_us_first_call / no_rep — not part of calibration
  }
  // not flagged
  if (code === "signed_elsewhere") return "missed_catch";
  if (code === "not_signable_disqualified" || code === "no_representation")
    return "correct_pass";
  return "excluded";
}

export function reconcile(
  call: ScoredCall,
  meta: CallMeta,
  outcome: Outcome,
): ReconciledCall {
  const flagged = isFlagged(call);
  const code = outcome.outcome_code;
  return {
    call,
    meta,
    outcome,
    flagged,
    feeAtRisk: feeAtRisk(call),
    overall: call.scores.overall,
    confidence: call.scores.confidence ?? "unknown",
    band: scoreBand(call.scores.overall),
    verdict: deriveVerdict(flagged, code),
  };
}
