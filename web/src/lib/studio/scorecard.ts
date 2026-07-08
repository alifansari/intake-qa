import { computeSpotCheck, computeLeakage } from "./rubric";
import {
  disclosures as disclosuresImpl,
  generateRefCode as generateRefCodeImpl,
  pickKeyExcerpt as pickKeyExcerptImpl,
  SIGNATURE_ANALYST as SIGNATURE_ANALYST_IMPL,
} from "./scorecard-content.mjs";

// ---------------------------------------------------------------------------
// Scorecard helpers. The pure, testable content helpers live in
// scorecard-content.mjs (so node --test runs them); this file adds the
// rubric-backed recompute and typed re-exports.
// ---------------------------------------------------------------------------

// Recompute the deterministic score/grade/leakage from the founder's inputs. This
// is what gets persisted — always from the rubric, never from the LLM.
export function recomputeDeterministic(input: {
  dimensionInputs?: Record<string, number>;
  criticalFails?: string[];
  averageSignedCaseFee?: number | null;
  illustrativeMonthlyRecurrence?: number | null;
}) {
  const spot = computeSpotCheck({
    dimensionInputs: input.dimensionInputs,
    criticalFails: input.criticalFails,
  });
  const leak = computeLeakage({
    averageSignedCaseFee: input.averageSignedCaseFee,
    illustrativeMonthlyRecurrence: input.illustrativeMonthlyRecurrence,
  });
  return { spot, leak };
}

export const disclosures: (callsAnalyzed: number) => {
  scope: string;
  independence: string;
  flatFee: string;
  limitation: string;
} = disclosuresImpl;

export const generateRefCode: (now?: Date) => string = generateRefCodeImpl;
export const pickKeyExcerpt: (scoring: unknown) => string | null = pickKeyExcerptImpl;
export const SIGNATURE_ANALYST: string = SIGNATURE_ANALYST_IMPL;
