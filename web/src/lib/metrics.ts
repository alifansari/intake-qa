import {
  BAND_LABEL,
  SCORE_BANDS,
  type ReconciledCall,
  type ScoreBand,
  isResolved,
  isSigned,
} from "./reconcile";

// ---------------------------------------------------------------------------
// Derived metrics. Every formula here is spelled out in plain terms in
// METHODOLOGY (below) so the UI can surface it verbatim in a tooltip. These are
// pure functions over ReconciledCall[] — no I/O, safe on client or server.
// ---------------------------------------------------------------------------

const WITHIN_DAYS = 14;
const COLD_HOURS = 1; // "cold" callback threshold used in the decay narrative

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export interface CalibrationCounts {
  correctFlags: number; // true positives (incl. recovered)
  falseAlarms: number; // false positives
  missedCatches: number; // false negatives
  correctPasses: number; // true negatives
  excluded: number; // no ground truth yet
}

export function calibrationCounts(rows: ReconciledCall[]): CalibrationCounts {
  const c: CalibrationCounts = {
    correctFlags: 0,
    falseAlarms: 0,
    missedCatches: 0,
    correctPasses: 0,
    excluded: 0,
  };
  for (const r of rows) {
    switch (r.verdict) {
      case "correct_flag":
      case "correct_flag_recovered":
        c.correctFlags++;
        break;
      case "false_alarm":
        c.falseAlarms++;
        break;
      case "missed_catch":
        c.missedCatches++;
        break;
      case "correct_pass":
        c.correctPasses++;
        break;
      default:
        c.excluded++;
    }
  }
  return c;
}

// Flag Precision = correct_flags / (correct_flags + false_alarms).
export function flagPrecision(rows: ReconciledCall[]): number | null {
  const c = calibrationCounts(rows);
  return ratio(c.correctFlags, c.correctFlags + c.falseAlarms);
}

// Catch Rate (recall) = correct_flags / (correct_flags + missed_catches).
export function catchRate(rows: ReconciledCall[]): number | null {
  const c = calibrationCounts(rows);
  return ratio(c.correctFlags, c.correctFlags + c.missedCatches);
}

export interface RecoveredFees {
  conservative: number;
  optimistic: number;
  conservativeCount: number;
  optimisticExtraCount: number;
}

// Conservative = flagged + signed_us_after_callback + callback made within 14d.
// Optimistic   = conservative PLUS flagged + still_open + callback made (potential).
export function recoveredFees(rows: ReconciledCall[]): RecoveredFees {
  let conservative = 0;
  let optimisticExtra = 0;
  let conservativeCount = 0;
  let optimisticExtraCount = 0;
  for (const r of rows) {
    if (!r.flagged || !r.outcome.callback_made) continue;
    const ttc = r.outcome.time_to_callback_hours;
    const withinWindow = ttc != null && ttc <= WITHIN_DAYS * 24;
    if (r.outcome.outcome_code === "signed_us_after_callback" && withinWindow) {
      conservative += r.feeAtRisk;
      conservativeCount++;
    } else if (r.outcome.outcome_code === "still_open") {
      optimisticExtra += r.feeAtRisk;
      optimisticExtraCount++;
    }
  }
  return {
    conservative,
    optimistic: conservative + optimisticExtra,
    conservativeCount,
    optimisticExtraCount,
  };
}

// Callback Conversion Lift = sign rate of flagged+callback minus flagged+no-callback.
export interface CallbackLift {
  withCallbackRate: number | null;
  withoutCallbackRate: number | null;
  lift: number | null;
  withCallbackN: number;
  withoutCallbackN: number;
}

export function callbackLift(rows: ReconciledCall[]): CallbackLift {
  const flaggedResolved = rows.filter(
    (r) => r.flagged && isResolved(r.outcome.outcome_code),
  );
  const withCb = flaggedResolved.filter((r) => r.outcome.callback_made);
  const withoutCb = flaggedResolved.filter((r) => !r.outcome.callback_made);
  const signRate = (set: ReconciledCall[]) => {
    const signedUs = set.filter(
      (r) =>
        r.outcome.outcome_code === "signed_us_first_call" ||
        r.outcome.outcome_code === "signed_us_after_callback",
    ).length;
    return ratio(signedUs, set.length);
  };
  const withCallbackRate = signRate(withCb);
  const withoutCallbackRate = signRate(withoutCb);
  const lift =
    withCallbackRate != null && withoutCallbackRate != null
      ? withCallbackRate - withoutCallbackRate
      : null;
  return {
    withCallbackRate,
    withoutCallbackRate,
    lift,
    withCallbackN: withCb.length,
    withoutCallbackN: withoutCb.length,
  };
}

// Median Time-to-Callback over calls with callback_made = true.
export function medianTimeToCallback(rows: ReconciledCall[]): number | null {
  const hours = rows
    .filter((r) => r.outcome.callback_made && r.outcome.time_to_callback_hours != null)
    .map((r) => r.outcome.time_to_callback_hours as number);
  return median(hours);
}

// Sign Rate by Score Band — the hero chart. (# signed us or elsewhere) / (resolved in band).
export interface BandSignRate {
  band: ScoreBand;
  label: string;
  signRate: number | null;
  signed: number;
  resolved: number;
}

export function signRateByBand(rows: ReconciledCall[]): BandSignRate[] {
  return SCORE_BANDS.map((band) => {
    const inBand = rows.filter(
      (r) => r.band === band && isResolved(r.outcome.outcome_code),
    );
    const signed = inBand.filter((r) => isSigned(r.outcome.outcome_code)).length;
    return {
      band,
      label: BAND_LABEL[band],
      signRate: ratio(signed, inBand.length),
      signed,
      resolved: inBand.length,
    };
  });
}

// Flag precision computed separately per confidence band.
export interface ConfidenceAccuracy {
  confidence: "high" | "medium" | "low";
  precision: number | null;
  correctFlags: number;
  falseAlarms: number;
}

export function precisionByConfidence(rows: ReconciledCall[]): ConfidenceAccuracy[] {
  return (["high", "medium", "low"] as const).map((confidence) => {
    const subset = rows.filter((r) => r.confidence === confidence);
    const c = calibrationCounts(subset);
    return {
      confidence,
      precision: ratio(c.correctFlags, c.correctFlags + c.falseAlarms),
      correctFlags: c.correctFlags,
      falseAlarms: c.falseAlarms,
    };
  });
}

// Data Quality = % of calls with outcome_code = unknown.
export function dataQuality(rows: ReconciledCall[]): {
  unknown: number;
  total: number;
  pctUnknown: number;
} {
  const unknown = rows.filter((r) => r.outcome.outcome_code === "unknown").length;
  return {
    unknown,
    total: rows.length,
    pctUnknown: rows.length ? unknown / rows.length : 0,
  };
}

// Recovery funnel: flagged -> called back -> reached -> signed.
export interface Funnel {
  flagged: number;
  calledBack: number;
  reached: number;
  signed: number;
}

export function recoveryFunnel(rows: ReconciledCall[]): Funnel {
  const flagged = rows.filter((r) => r.flagged);
  const calledBack = flagged.filter((r) => r.outcome.callback_made);
  // "reached" = we made contact — anything not unreachable and not still-unknown.
  const reached = calledBack.filter(
    (r) => !["unreachable", "unknown"].includes(r.outcome.outcome_code),
  );
  const signed = calledBack.filter(
    (r) =>
      r.outcome.outcome_code === "signed_us_after_callback" ||
      r.outcome.outcome_code === "signed_us_first_call",
  );
  return {
    flagged: flagged.length,
    calledBack: calledBack.length,
    reached: reached.length,
    signed: signed.length,
  };
}

// Time-to-callback decay: sign rate bucketed by how fast the callback happened.
export interface DecayBucket {
  label: string;
  signRate: number | null;
  n: number;
}

export function callbackDecay(rows: ReconciledCall[]): DecayBucket[] {
  const buckets: { label: string; min: number; max: number }[] = [
    { label: "< 1 hr", min: 0, max: 1 },
    { label: "1–4 hrs", min: 1, max: 4 },
    { label: "4–24 hrs", min: 4, max: 24 },
    { label: "> 24 hrs", min: 24, max: Infinity },
  ];
  const flaggedCb = rows.filter(
    (r) =>
      r.flagged &&
      r.outcome.callback_made &&
      r.outcome.time_to_callback_hours != null &&
      isResolved(r.outcome.outcome_code),
  );
  return buckets.map((b) => {
    const inBucket = flaggedCb.filter((r) => {
      const t = r.outcome.time_to_callback_hours as number;
      return t >= b.min && t < b.max;
    });
    const signed = inBucket.filter(
      (r) => r.outcome.outcome_code === "signed_us_after_callback",
    ).length;
    return { label: b.label, signRate: ratio(signed, inBucket.length), n: inBucket.length };
  });
}

// "What-if": recompute recovered fees if the callback rate on flagged calls moved
// to `targetRate`. Uses the observed post-callback sign rate + median fee at risk.
export function whatIfRecovery(
  rows: ReconciledCall[],
  targetCallbackRate: number,
): { recovered: number; currentCallbackRate: number; signRateOnCallback: number } {
  const flagged = rows.filter((r) => r.flagged);
  const calledBack = flagged.filter((r) => r.outcome.callback_made);
  const currentCallbackRate = flagged.length ? calledBack.length / flagged.length : 0;
  const signedAfterCb = calledBack.filter(
    (r) => r.outcome.outcome_code === "signed_us_after_callback",
  );
  const signRateOnCallback = calledBack.length
    ? signedAfterCb.length / calledBack.length
    : 0;
  const avgFee =
    flagged.length > 0
      ? flagged.reduce((s, r) => s + r.feeAtRisk, 0) / flagged.length
      : 0;
  const projectedCallbacks = flagged.length * targetCallbackRate;
  const recovered = projectedCallbacks * signRateOnCallback * avgFee;
  return { recovered, currentCallbackRate, signRateOnCallback };
}

// Plain-language method notes surfaced in the UI (tooltips / methodology page).
export const METHODOLOGY = {
  flagPrecision:
    "When we flag a call as a lost signable case, we're right this share of the time. Formula: correct flags ÷ (correct flags + false alarms), counting recovered cases as correct. Calls without a confirmed outcome are excluded.",
  catchRate:
    "Of the signable cases that actually walked (signed elsewhere), the share we caught. Formula: correct flags ÷ (correct flags + missed catches).",
  recoveredFees: `Conservative counts only flagged calls that got a callback and then signed with us within ${WITHIN_DAYS} days. Optimistic adds flagged calls that got a callback and are still open (potential). We always show both bounds — never a single number.`,
  callbackLift:
    "Sign rate of flagged calls that got a callback, minus the sign rate of flagged calls that got none. The gap is the value of following up.",
  signRateByBand:
    "For each score band, the share of resolved calls that signed (with us or elsewhere). If the score predicts reality, higher bands sign far more often than lower bands.",
  confidenceAccuracy:
    "Flag precision computed separately for high-, medium-, and low-confidence flags. High-confidence flags should be right more often.",
  dataQuality:
    "Share of scored calls that still have no recorded outcome. Every unknown is a hole in the math above.",
  coldCallback: `A callback slower than ${COLD_HOURS} hour rarely recovers a lead — the decay curve shows sign rate falling as callback time grows.`,
} as const;
