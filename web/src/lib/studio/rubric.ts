// Typed re-export of the deterministic rubric (implemented in rubric.mjs so the
// node --test runner imports it with zero build step). Import from here in TS.
// The .mjs file is the single source of truth for the math; this only adds types.
import * as impl from "./rubric.mjs";

export interface Dimension {
  key: string;
  label: string;
  weight: number;
}
export interface CriticalFail {
  key: string;
  label: string;
}
export interface DimensionScore {
  key: string;
  label: string;
  weight: number;
  input: number;
  weighted: number;
}
export interface SpotCheckResult {
  score: number;
  grade: string;
  rawScore: number;
  rawGrade: string;
  criticalFailTriggered: boolean;
  activeCriticalFails: string[];
  dimensionScores: DimensionScore[];
}
export interface LeakageResult {
  singleCase: number | null;
  illustrativeAnnual: number | null;
  averageSignedCaseFee: number | null;
  illustrativeMonthlyRecurrence: number;
}

export const DIMENSIONS: Dimension[] = impl.DIMENSIONS;
export const DIMENSION_LEVELS: number[] = impl.DIMENSION_LEVELS;
export const GRADE_THRESHOLDS: { grade: string; min: number }[] = impl.GRADE_THRESHOLDS;
export const CRITICAL_FAILS: CriticalFail[] = impl.CRITICAL_FAILS;
export const TOTAL_WEIGHT: number = impl.TOTAL_WEIGHT;
export const AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER: number =
  impl.AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER;
export const DEFAULT_ILLUSTRATIVE_MONTHLY_RECURRENCE: number =
  impl.DEFAULT_ILLUSTRATIVE_MONTHLY_RECURRENCE;

export const gradeForScore: (score: number) => string = impl.gradeForScore;
export const computeSpotCheck: (input: {
  dimensionInputs?: Record<string, number>;
  criticalFails?: string[];
}) => SpotCheckResult = impl.computeSpotCheck;
export const computeLeakage: (input: {
  averageSignedCaseFee?: number | null;
  illustrativeMonthlyRecurrence?: number | null;
}) => LeakageResult = impl.computeLeakage;
export const isDimensionKey: (k: string) => boolean = impl.isDimensionKey;
export const isCriticalFailKey: (k: string) => boolean = impl.isCriticalFailKey;
