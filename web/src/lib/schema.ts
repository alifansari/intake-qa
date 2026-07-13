import { z } from "zod";

// ---------------------------------------------------------------------------
// ScoredCall — the EXISTING scoring-engine output (output/*.score.json).
// This schema is deliberately LOOSE (.passthrough, most fields optional) so a
// real, hand-scored call file drops in unchanged and never fails validation on
// a field the dashboard doesn’t happen to use. We only pin the handful of
// fields the reconciliation math and UI actually read.
// DO NOT redesign this to "clean it up" — it mirrors the calibrated engine.
// ---------------------------------------------------------------------------

export const RevenueAtRisk = z
  .object({
    amount_usd: z.number().nullish(),
    case_type_matched: z.string().nullish(),
    basis: z.string().nullish(),
    evidence_quotes: z.array(z.string()).nullish(),
  })
  .passthrough();

export const Alerts = z
  .object({
    lost_signable_case: z.boolean().optional(),
    missed_development_opportunity: z.boolean().optional(),
    after_hours_leak: z.boolean().optional(),
    revenue_at_risk: RevenueAtRisk.optional(),
  })
  .passthrough();

export const Scores = z
  .object({
    overall: z.number(),
    band: z.string().optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
    categories: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ScoredCall = z
  .object({
    call_id: z.string(),
    call_type: z.string().optional(),
    language: z.string().optional(),
    duration_assessed_sec: z.number().optional(),
    case_signability: z.string().optional(),
    critical_fails: z.array(z.unknown()).optional(),
    alerts: Alerts.optional(),
    scores: Scores,
    coaching: z.unknown().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

export type ScoredCall = z.infer<typeof ScoredCall>;

// ---------------------------------------------------------------------------
// CallMeta — sidecar metadata. The score.json intentionally carries NO call
// date and NO rep name (a real system learns those from the upload, not the
// rubric). We keep them separate so the score files stay pristine.
// ---------------------------------------------------------------------------

export const CallMeta = z.object({
  call_id: z.string(),
  received_at: z.string(), // ISO — when the intake call came in
  rep: z.string(),
  source: z.string(), // marketing/referral source
});
export type CallMeta = z.infer<typeof CallMeta>;

// ---------------------------------------------------------------------------
// Outcome — the reconciliation record, keyed by call_id. Sibling to ScoredCall.
// ---------------------------------------------------------------------------

export const OUTCOME_CODES = [
  "signed_us_first_call",
  "signed_us_after_callback",
  "signed_elsewhere",
  "no_representation",
  "not_signable_disqualified",
  "still_open",
  "unreachable",
  "unknown",
] as const;

export const OutcomeCode = z.enum(OUTCOME_CODES);
export type OutcomeCode = z.infer<typeof OutcomeCode>;

export const OutcomeEdit = z.object({
  outcome_code: OutcomeCode,
  callback_made: z.boolean(),
  outcome_entered_by: z.string(),
  outcome_entered_at: z.string(),
  outcome_version: z.number().int(),
});

export const Outcome = z.object({
  call_id: z.string(),
  outcome_code: OutcomeCode,
  callback_made: z.boolean(),
  callback_timestamp: z.string().nullable(),
  time_to_callback_hours: z.number().nullable(),
  who_called: z.string().nullable(),
  realized_fee_recovered: z.number().nullable(),
  outcome_entered_by: z.string(),
  outcome_entered_at: z.string(),
  outcome_version: z.number().int(),
  edits: z.array(OutcomeEdit).default([]),
});
export type Outcome = z.infer<typeof Outcome>;

// A blank "unknown" outcome for any call that has never been reconciled.
export function defaultOutcome(callId: string): Outcome {
  return {
    call_id: callId,
    outcome_code: "unknown",
    callback_made: false,
    callback_timestamp: null,
    time_to_callback_hours: null,
    who_called: null,
    realized_fee_recovered: null,
    outcome_entered_by: "system",
    outcome_entered_at: new Date(0).toISOString(),
    outcome_version: 0,
    edits: [],
  };
}
