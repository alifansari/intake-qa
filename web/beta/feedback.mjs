// Structured feedback capture (module 0c) — the purpose of the beta.
//
// Feedback is tied to the SPECIFIC output the tester just received (an audit
// report, a rescue packet, a coaching note), never one global survey. Four
// dimensions map to what the beta must learn: UX (onboarding friction / report
// clarity / delivery experience), UTILITY (were flags genuinely signable),
// TRUST (false positives, score confidence), WILLINGNESS-TO-PAY (flat monthly
// only — a per-case WTP answer is structurally unrepresentable here).
//
// Split: pure validation + aggregation (no I/O), thin persistence wrappers.

import { createBetaFeedback, listBetaFeedback } from "./store.mjs";

export const SUBJECT_TYPES = Object.freeze([
  "audit",
  "rescue_packet",
  "coaching",
  "onboarding",
  "general",
]);

const RATING_FIELDS = ["ux_setup_ease", "ux_report_clarity", "ux_delivery", "trust_score"];
const ENUM_FIELDS = Object.freeze({
  utility_flags_signable: ["yes", "no", "partial"],
  utility_would_have_recovered: ["yes", "no", "unsure"],
  utility_diagnosis_accurate: ["yes", "no", "partial"],
  utility_script_usable: ["yes", "no", "with_edits"],
  wtp_would_pay: ["yes", "no", "maybe"],
});

// Pure validation. Returns { ok, errors }.
export function validateFeedback(body) {
  const errors = [];
  if (!SUBJECT_TYPES.includes(body?.subject_type)) errors.push("invalid:subject_type");
  // Per-artifact feedback must name its artifact; only 'general' may omit it.
  if (body?.subject_type !== "general" && !body?.subject_id) errors.push("missing:subject_id");
  if (body?.firm_id == null && body?.applicant_id == null) errors.push("missing:firm_or_applicant");

  for (const field of RATING_FIELDS) {
    const v = body?.[field];
    if (v != null && !(Number.isInteger(v) && v >= 1 && v <= 5)) errors.push(`invalid:${field}`);
  }
  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const v = body?.[field];
    if (v != null && !allowed.includes(v)) errors.push(`invalid:${field}`);
  }
  if (body?.wtp_monthly_max_cents != null) {
    const cents = Number(body.wtp_monthly_max_cents);
    if (!(Number.isFinite(cents) && cents >= 0)) errors.push("invalid:wtp_monthly_max_cents");
  }
  if (body?.trust_false_positives != null) {
    const n = Number(body.trust_false_positives);
    if (!(Number.isInteger(n) && n >= 0)) errors.push("invalid:trust_false_positives");
  }
  return { ok: errors.length === 0, errors };
}

// Record one piece of feedback. Returns { feedbackId } or { errors }.
export async function recordFeedback({ db, feedback }) {
  const check = validateFeedback(feedback);
  if (!check.ok) return { errors: check.errors };
  const feedbackId = await createBetaFeedback(db, feedback);
  return { feedbackId };
}

const avg = (xs) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const tally = (xs) =>
  xs.reduce((acc, x) => {
    acc[x] = (acc[x] ?? 0) + 1;
    return acc;
  }, {});

// Pure aggregation for the founder view. Takes raw rows, returns the learning
// signals the beta exists to produce.
export function aggregateFeedback(rows) {
  const num = (field) => rows.map((r) => r[field]).filter((v) => v != null).map(Number);
  const en = (field) => tally(rows.map((r) => r[field]).filter((v) => v != null));
  return {
    count: rows.length,
    bySubjectType: tally(rows.map((r) => r.subject_type)),
    ux: {
      setup_ease_avg: avg(num("ux_setup_ease")),
      report_clarity_avg: avg(num("ux_report_clarity")),
      delivery_avg: avg(num("ux_delivery")),
    },
    utility: {
      flags_signable: en("utility_flags_signable"),
      would_have_recovered: en("utility_would_have_recovered"),
      diagnosis_accurate: en("utility_diagnosis_accurate"),
      script_usable: en("utility_script_usable"),
    },
    trust: {
      score_avg: avg(num("trust_score")),
      false_positives_total: num("trust_false_positives").reduce((a, b) => a + b, 0),
    },
    willingnessToPay: {
      would_pay: en("wtp_would_pay"),
      monthly_max_cents_avg: avg(num("wtp_monthly_max_cents")),
      must_haves: rows.map((r) => r.wtp_must_have).filter(Boolean),
    },
  };
}

// Founder-facing rollup: aggregate + per-subject drill-down for one firm (or
// all firms when firmId is null).
export async function feedbackSummary({ db, firmId = null }) {
  const rows = await listBetaFeedback(db, firmId != null ? { firmId } : {});
  return { aggregate: aggregateFeedback(rows), rows };
}
