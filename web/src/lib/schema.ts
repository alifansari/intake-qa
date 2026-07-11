import { z } from "zod";

// ---------------------------------------------------------------------------
// ScoredCall — the EXISTING scoring-engine output (output/*.score.json).
// This schema is deliberately LOOSE (.passthrough, most fields optional) so a
// real, hand-scored call file drops in unchanged and never fails validation on
// a field the dashboard doesn't happen to use. We only pin the handful of
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

// ---------------------------------------------------------------------------
// Increment 0 — the outcome-data flywheel (ops/drafts/engine-v2-conveyor-MVP.md
// §6 + AMENDMENT). Two NEW siblings keyed by call_id. They extend the model
// exactly the way CLAUDE.md requires: sibling records, never edits to
// ScoredCall or to the existing Outcome above.
//
//   CaseDisposition — what the firm DID, captured near intake, with an
//     IMMUTABLE intake_feature_snapshot (what was KNOWN at decision time).
//   CaseOutcome — what HAPPENED, captured at the monthly reconciliation,
//     T+months/years. Every money field is nullable: missing = censored,
//     NEVER zero. Open cases are right-censored. Declines are censored too.
// ---------------------------------------------------------------------------

export const DISPOSITION_CODES = [
  "signed",
  "developing",
  "referred_out",
  "declined",
  "no_action",
] as const;
export const DispositionCode = z.enum(DISPOSITION_CODES);
export type DispositionCode = z.infer<typeof DispositionCode>;

export const CaseDisposition = z.object({
  call_id: z.string(),
  flag_id: z.string().nullable(),
  firm_id: z.string(),
  disposition: DispositionCode,
  decided_by: z.string(), // ROLE text (e.g. "attorney"), never a scored staffer
  decided_at: z.string(), // ISO — when the firm made the call
  // Immutable once set: backbone facts + question-check states + answer_values
  // as known AT DECISION TIME. Repository upserts never overwrite a non-empty
  // snapshot (validate against what was known then, not learned later).
  intake_feature_snapshot: z.record(z.string(), z.unknown()).default({}),
  external_case_ref: z.string().nullable(), // CMS matter id (Filevine/Litify/Clio)
  created_at: z.string(),
});
export type CaseDisposition = z.infer<typeof CaseDisposition>;

export const END_STATES = [
  "settled",
  "tried",
  "dropped",
  "withdrew",
  "referred_resolved",
  "open",
] as const;
export const EndState = z.enum(END_STATES);
export type EndState = z.infer<typeof EndState>;

// A money/duration value in the flywheel is either unknown (null — censored),
// a point value, or a BAND the firm reported ("$10k–$25k") kept as a band —
// collapsing a band to a point would manufacture precision we don't have.
export const ValueBand = z.object({
  kind: z.literal("band"),
  low: z.number(),
  high: z.number(),
  raw: z.string(), // the band exactly as the firm reported it
});
export type ValueBand = z.infer<typeof ValueBand>;

export const CensoredNumber = z.union([z.number(), ValueBand]).nullable();
export type CensoredNumber = z.infer<typeof CensoredNumber>;

// Prior snapshot appended on every edit (same audit pattern as OutcomeEdit).
export const CaseOutcomeEdit = z.object({
  end_state: EndState,
  gross: CensoredNumber,
  costs_advanced: CensoredNumber,
  lien_load: CensoredNumber,
  net_to_client: CensoredNumber,
  net_fee_to_firm: CensoredNumber,
  referral_fee: CensoredNumber,
  time_to_resolution_days: z.number().nullable(),
  demand_sent_at: z.string().nullable(),
  demand_amount: CensoredNumber,
  first_offer: CensoredNumber,
  entered_by: z.string(),
  entered_at: z.string(),
  outcome_version: z.number().int(),
});
export type CaseOutcomeEdit = z.infer<typeof CaseOutcomeEdit>;

export const CaseOutcome = z.object({
  call_id: z.string(),
  firm_id: z.string(),
  end_state: EndState, // "open" = right-censored, still accruing
  gross: CensoredNumber,
  costs_advanced: CensoredNumber,
  lien_load: CensoredNumber,
  net_to_client: CensoredNumber,
  net_fee_to_firm: CensoredNumber, // the target metric's numerator, when known
  referral_fee: CensoredNumber,
  time_to_resolution_days: z.number().nullable(),
  // Demand milestones (AMENDMENT #4): intake facts -> demand -> recovery.
  demand_sent_at: z.string().nullable(),
  demand_amount: CensoredNumber,
  first_offer: CensoredNumber,
  entered_by: z.string(),
  entered_at: z.string(),
  outcome_version: z.number().int(),
  edits: z.array(CaseOutcomeEdit).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CaseOutcome = z.infer<typeof CaseOutcome>;

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
