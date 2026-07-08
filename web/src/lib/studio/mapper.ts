// Typed re-export of the deterministic engine→scorecard mapper (implemented in
// mapper.mjs so the node --test runner imports it with zero build step). Import
// from here in TS. The .mjs file is the single source of truth for the mapping.
import * as impl from "./mapper.mjs";

export interface DerivedLeakageInputs {
  average_signed_case_fee: number | null;
  illustrative_monthly_recurrence: number;
  case_type_matched: string | null;
  basis: string | null;
}

export interface MappedScorecardInputs {
  // A dimension value is a level (0/50/100) or null ("Not assessed" — the
  // front-door dims when there is no genuine reachability/answer-speed signal).
  dimensionInputs: Record<string, number | null>;
  criticalFails: string[];
  leakageInputs: DerivedLeakageInputs;
}

export interface DraftedNarrative {
  narrative_failure: string;
  narrative_fix: string;
}

export const CASE_TYPE_FEE_BENCHMARKS: Record<string, number> = impl.CASE_TYPE_FEE_BENCHMARKS;

export const mapEngineToScorecard: (
  scoring: unknown,
  transcript?: string,
) => MappedScorecardInputs = impl.mapEngineToScorecard;

export const deriveLeakageInputs: (scoring: unknown) => DerivedLeakageInputs =
  impl.deriveLeakageInputs;

export const draftNarrativeFromEngine: (scoring: unknown) => DraftedNarrative =
  impl.draftNarrativeFromEngine;
