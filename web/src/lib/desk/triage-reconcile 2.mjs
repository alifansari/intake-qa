// ---------------------------------------------------------------------------
// The ground-truth loop for the DETERMINISTIC TRIAGE ENGINE.
//
// This is the credibility spine of the "independent intake audit". It joins
// each triage case's PREDICTED disposition (what the engine said: sign_now /
// develop / refer_out / decline_with_grace) against its TERMINAL OUTCOME (what
// the firm actually did: signed / declined / referred), and derives the
// calibration the audit report rests on: "when we said SIGN, you signed 88%".
//
// It mirrors reconcile.ts + metrics.ts (the v1 loop over `lost_signable_case`)
// but for the 4-way triage engine, whose accuracy was previously UNMEASURED
// even though `triage_cases` already stores both the verdict and the terminal
// status. Pure functions, no I/O — safe on client or server, identical for
// SQLite now and Postgres later.
//
// Compliance note (invariants §IV): every rate here is an ESTIMATE over a
// resolved sample. Never surface a rate without its n and confidence interval;
// use `publishable()` to gate small samples. No claim without the count.
// ---------------------------------------------------------------------------

/** The engine's four possible calls, in decreasing appetite. */
export const DISPOSITIONS = ["sign_now", "develop", "refer_out", "decline_with_grace"];

/** The three terminal outcomes that constitute ground truth. */
export const TERMINAL_OUTCOMES = ["signed", "declined", "referred"];

/** Statuses that are NOT yet ground truth — excluded from all calibration math. */
export const OPEN_STATUSES = ["new", "callback", "contacted"];

export const DISPOSITION_LABEL = {
  sign_now: "Sign now",
  develop: "Develop",
  refer_out: "Refer out",
  decline_with_grace: "Decline",
};

export const OUTCOME_LABEL = {
  signed: "Signed",
  declined: "Declined",
  referred: "Referred out",
};

// The malpractice-adjacent error: we advised the firm NOT to sign (decline or
// refer) and they signed it anyway. Weighted heavily because a wrongful decline
// is the error class that loses a firm a real case — the one an audit authority
// must be hardest on itself about.
export const WRONGFUL_DECLINE_WEIGHT = 10;

// The set of terminal outcomes that VINDICATE each disposition (the engine's
// call matched what the firm did). `develop` is not a directional call — it
// means "get more facts" — so it has no expected outcome and is reported as a
// split, never scored as right/wrong.
const EXPECTED_OUTCOMES = {
  sign_now: ["signed"],
  decline_with_grace: ["declined", "referred"],
  refer_out: ["referred", "declined"],
  develop: null,
};

/** A resolved case is one whose status is a terminal outcome. */
export function isResolved(status) {
  return TERMINAL_OUTCOMES.includes(status);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

// ---------------------------------------------------------------------------
// The verdict table for the disposition engine (analogue of deriveVerdict in
// reconcile.ts). Only resolved cases get a directional verdict.
//   agree            — the engine's call matched what the firm did
//   overcall         — we said SIGN, the firm declined/referred (precision miss)
//   wrongful_decline — we said DECLINE/REFER, the firm signed (the safety error)
//   develop_resolved — a `develop` call that reached a terminal outcome
//   open             — no ground truth yet (excluded from calibration)
// ---------------------------------------------------------------------------
export function deriveTriageVerdict(disposition, status) {
  if (!isResolved(status)) return "open";
  switch (disposition) {
    case "sign_now":
      return status === "signed" ? "agree" : "overcall";
    case "decline_with_grace":
    case "refer_out":
      if (status === "signed") return "wrongful_decline";
      return "agree";
    case "develop":
      return "develop_resolved";
    default:
      return "open";
  }
}

// Defensively pull the predicted disposition and terminal status from a raw
// triage_cases row. The `disposition` and `status` columns are the source of
// truth; fall back to verdict_json only if the column is absent.
export function normalizeTriageRow(row = {}) {
  let disposition = row.disposition ?? null;
  if (!disposition && row.verdict_json) {
    try {
      const v =
        typeof row.verdict_json === "string"
          ? JSON.parse(row.verdict_json)
          : row.verdict_json;
      disposition = v?.disposition ?? null;
    } catch {
      disposition = null;
    }
  }
  return {
    id: row.id ?? null,
    disposition,
    status: row.status ?? "new",
    grade_letter: row.grade_letter ?? null,
    value_tier: row.value_tier ?? null,
    case_type: row.case_type ?? null,
    signed_where: row.signed_where ?? null, // "us" | "elsewhere" | null (added by outcome capture)
    created_at: row.created_at ?? null,
  };
}

/** Join a list of raw triage rows into reconciled records with a verdict. */
export function reconcileTriage(rows = []) {
  return rows.map((raw) => {
    const r = normalizeTriageRow(raw);
    return {
      ...r,
      resolved: isResolved(r.status),
      verdict: deriveTriageVerdict(r.disposition, r.status),
    };
  });
}

// ---------------------------------------------------------------------------
// The confusion matrix: 4 dispositions × 3 terminal outcomes, counts only over
// resolved cases. This is the artifact the audit report renders.
// ---------------------------------------------------------------------------
export function triageConfusionMatrix(reconciled = []) {
  const matrix = {};
  const rowTotals = {};
  for (const d of DISPOSITIONS) {
    matrix[d] = { signed: 0, declined: 0, referred: 0 };
    rowTotals[d] = 0;
  }
  const colTotals = { signed: 0, declined: 0, referred: 0 };
  let resolved = 0;
  let open = 0;
  for (const r of reconciled) {
    if (!r.resolved) {
      open++;
      continue;
    }
    if (!matrix[r.disposition]) continue; // unknown/missing disposition — not scored
    matrix[r.disposition][r.status]++;
    rowTotals[r.disposition]++;
    colTotals[r.status]++;
    resolved++;
  }
  return { matrix, rowTotals, colTotals, resolved, open };
}

// Wilson score interval for a binomial proportion — the honest way to show a
// rate over a small sample (§IV). Returns the point estimate, the [lo, hi]
// bounds, and n so the caller can never render a rate without its uncertainty.
export function wilson(successes, n, z = 1.96) {
  if (!n || n <= 0) return { point: null, lo: null, hi: null, n: 0 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
  return {
    point: p,
    lo: Math.max(0, center - margin),
    hi: Math.min(1, center + margin),
    n,
  };
}

// The minimum resolved sample below which a rate must NOT be published as a
// headline number (§IV: never present a probabilistic inference as certainty).
export const MIN_PUBLISH_N = 30;
export function publishable(n, min = MIN_PUBLISH_N) {
  return n >= min;
}

// ---------------------------------------------------------------------------
// Per-disposition calibration — the headline of the report. For each
// disposition: how many resolved, the split across outcomes, the agreement rate
// (share whose outcome vindicated the call) with a Wilson interval, and whether
// the sample is large enough to publish.
// ---------------------------------------------------------------------------
export function dispositionCalibration(reconciled = []) {
  const { matrix, rowTotals } = triageConfusionMatrix(reconciled);
  return DISPOSITIONS.map((d) => {
    const byOutcome = matrix[d];
    const resolved = rowTotals[d];
    const expected = EXPECTED_OUTCOMES[d];
    let agree = null;
    let interval = wilson(0, 0);
    if (expected) {
      const hits = expected.reduce((s, o) => s + byOutcome[o], 0);
      agree = ratio(hits, resolved);
      interval = wilson(hits, resolved);
    }
    return {
      disposition: d,
      label: DISPOSITION_LABEL[d],
      resolved,
      byOutcome,
      directional: expected !== null,
      agreeRate: agree,
      interval,
      publishable: publishable(resolved),
    };
  });
}

// Headline #1: "When we said SIGN, you signed X% (n=…)". Point + interval + n.
export function signPrecision(reconciled = []) {
  const signNow = reconciled.filter((r) => r.disposition === "sign_now" && r.resolved);
  const signed = signNow.filter((r) => r.status === "signed").length;
  return wilson(signed, signNow.length);
}

// Headline #2: "When we said PASS, you passed X% (n=…)". Pass = declined OR
// referred (both vindicate a decline call), over decline_with_grace cases.
export function passPrecision(reconciled = []) {
  const declines = reconciled.filter(
    (r) => r.disposition === "decline_with_grace" && r.resolved,
  );
  const passed = declines.filter((r) => r.status !== "signed").length;
  return wilson(passed, declines.length);
}

// The named error: we advised against signing (decline OR refer) and they
// signed. Returns the count, the rate over all such advised-against cases, and
// the underlying case ids so the report can link each one.
export function wrongfulDeclines(reconciled = []) {
  const advisedAgainst = reconciled.filter(
    (r) =>
      (r.disposition === "decline_with_grace" || r.disposition === "refer_out") &&
      r.resolved,
  );
  const wrong = advisedAgainst.filter((r) => r.verdict === "wrongful_decline");
  return {
    count: wrong.length,
    ofAdvisedAgainst: advisedAgainst.length,
    rate: ratio(wrong.length, advisedAgainst.length),
    interval: wilson(wrong.length, advisedAgainst.length),
    ids: wrong.map((r) => r.id).filter((x) => x != null),
  };
}

// A single directional-error score with the wrongful-decline class weighted
// 10×. Lower is better. Excludes `develop` (non-directional).
export function weightedErrorScore(reconciled = []) {
  let errors = 0;
  let weighted = 0;
  let scored = 0;
  for (const r of reconciled) {
    if (!r.resolved) continue;
    if (r.verdict === "develop_resolved" || r.verdict === "open") continue;
    scored++;
    if (r.verdict === "overcall") {
      errors++;
      weighted += 1;
    } else if (r.verdict === "wrongful_decline") {
      errors++;
      weighted += WRONGFUL_DECLINE_WEIGHT;
    }
  }
  return { errors, weighted, scored };
}

// Overall directional agreement — share of directional (non-develop) resolved
// cases the engine got right. The single "are we accurate" number, with n + CI.
export function overallAgreement(reconciled = []) {
  const directional = reconciled.filter(
    (r) => r.resolved && r.verdict !== "develop_resolved" && r.verdict !== "open",
  );
  const agree = directional.filter((r) => r.verdict === "agree").length;
  return wilson(agree, directional.length);
}

// Data quality / honesty footer — how much of the sample is still open (no
// ground truth). Every open case is a hole in the math above.
export function triageDataQuality(reconciled = []) {
  const total = reconciled.length;
  const resolved = reconciled.filter((r) => r.resolved).length;
  const open = total - resolved;
  return {
    total,
    resolved,
    open,
    pctOpen: total ? open / total : 0,
    publishable: publishable(resolved),
  };
}

// One call that assembles the whole calibration report payload from raw rows.
export function buildCalibrationReport(rawRows = []) {
  const reconciled = reconcileTriage(rawRows);
  return {
    signPrecision: signPrecision(reconciled),
    passPrecision: passPrecision(reconciled),
    byDisposition: dispositionCalibration(reconciled),
    confusion: triageConfusionMatrix(reconciled),
    wrongfulDeclines: wrongfulDeclines(reconciled),
    weightedError: weightedErrorScore(reconciled),
    overallAgreement: overallAgreement(reconciled),
    dataQuality: triageDataQuality(reconciled),
  };
}

// Plain-language method notes, surfaced verbatim in the report UI (mirrors the
// METHODOLOGY block in metrics.ts).
export const TRIAGE_METHODOLOGY = {
  signPrecision:
    "Of the calls we graded SIGN NOW that reached a decision, the share the firm actually signed. Cases still being worked are excluded. Shown with the count and a confidence range, never as a bare number.",
  passPrecision:
    "Of the calls we graded DECLINE that reached a decision, the share the firm passed on or referred out. A high number means our declines were right.",
  wrongfulDeclines:
    "The cases we advised against taking (decline or refer) that the firm signed anyway. This is the error that costs a firm a real case, so we weight it ten times heavier than any other and call it out by name.",
  overallAgreement:
    "Across every call where we made a directional call (sign or pass) that reached a decision, the share the firm's own outcome agreed with. Develop calls are not counted — they ask for more facts rather than making a call.",
  dataQuality:
    "The share of graded calls that have no recorded outcome yet. Every open case is a hole in the accuracy math, so we publish it next to the numbers and suppress any rate whose sample is too small.",
  minPublishN: `We do not publish a headline accuracy rate until at least ${MIN_PUBLISH_N} cases have reached a decision, and we always show the confidence range around it.`,
};
