// Deterministic merit triage for imported CRM dead leads (the "rescue layer
// above the cadence").
//
// A CRM cadence re-touches leads on a TIMER; it cannot tell a $500 soft-tissue
// whiff from a lost six-figure case. This module answers the question the
// cadence structurally can't: "was this dead lead a live case, and what triage
// gap lost it?" — from the export's structured fields only.
//
// Architecture rules (from the engine-v2 research, ops/drafts/engine-v2-*):
//   * CODE, NOT LLM. Every verdict here is deterministic and testable; there is
//     no model call in this path. The frozen scoring engine is never touched.
//   * Screen out ONLY on legally-determinable facts (P0-2): statute likely run,
//     excluded case type, another firm retained, do-not-contact, outside
//     geography. Coverage/severity/fault are NEVER screen-out reasons — they
//     are value signals or honest unknowns.
//   * Absence is never evidence: a missing field maps to an unknown, never to
//     a demerit (e.g. missing attempt count can NOT mean "stopped too early").
//   * Value is a TIER (standard/elevated/high) with a cited basis — never a
//     dollar figure (Yang risk register R4: dollars at intake are a STOP).
//   * Language is a COVERAGE/fairness signal only: a Spanish-language lead can
//     change HOW we call back (in Spanish), never how much the case is worth
//     or whether it screens out.
//
// Every claim carries its basis string (no citation, no claim — invariant IV).

import { computeSol } from "../analysis/sol.mjs";

export const TRIAGE_RUBRIC_VERSION = "crm-triage-v1";

export const GAP_KINDS = Object.freeze([
  "language_gap", // Spanish-language lead; cadence ran in English
  "stopped_too_early", // <=2 logged attempts (93% of conversions take up to 6 — Velocify)
  "never_reached", // attempts logged but no live contact ever made
  "timer_expired", // cadence aged the lead out on a timer
  "unknown_gap", // export doesn't say — an unknown, not a guess
]);

export const VALUE_TIERS = Object.freeze(["standard", "elevated", "high"]);

// --- small helpers ------------------------------------------------------------

const norm = (s) => (s == null ? "" : String(s).toLowerCase());

function fieldsBlob(lead) {
  return [lead.crm_status, lead.crm_substatus, lead.notes]
    .map(norm)
    .join(" · ");
}

// Match whole-ish words so "not interested in chiro care" still matches but
// "surgery" never matches "surgeon's office called" incorrectly — keep the
// marker list narrow instead of the regex clever.
function findMarkers(text, markers) {
  const hay = norm(text);
  return markers.filter((m) => hay.includes(m));
}

// --- screen: legally-determinable exclusions only ------------------------------

const RETAINED_ELSEWHERE_MARKERS = [
  "hired another",
  "retained another",
  "signed with another",
  "went with another firm",
  "has an attorney",
  "already represented",
];
const NOT_INTERESTED_MARKERS = ["not interested", "no longer interested", "declined representation"];
const DO_NOT_CONTACT_MARKERS = ["do not contact", "do not call", "dnc", "opted out", "opt-out", "stop contact"];

const GOVERNMENT_MARKERS = [
  "city bus",
  "city vehicle",
  "county vehicle",
  "government",
  "city of ",
  "county of ",
  "school district",
  "transit authority",
  "metro bus",
  "usps",
  "police vehicle",
];

// Screen a normalized lead. Returns { verdict, screenReason?, sol }.
// The two legitimate cadence stopping rules ("hired another firm" and an
// explicit "not interested") are honored here — everything else a cadence
// calls dead is fair game for rescue (ops/insights.md callback science).
export function screenLead(lead, { tunables = {}, now = new Date() } = {}) {
  const blob = fieldsBlob(lead);
  const shortFields = `${norm(lead.crm_status)} · ${norm(lead.crm_substatus)}`;

  const dnc = findMarkers(blob, DO_NOT_CONTACT_MARKERS);
  if (dnc.length > 0) {
    return { verdict: "screened_out", screenReason: `do-not-contact on record ("${dnc[0]}") — never call back`, sol: null };
  }

  const retained = findMarkers(blob, RETAINED_ELSEWHERE_MARKERS);
  if (retained.length > 0) {
    return { verdict: "screened_out", screenReason: `another firm retained ("${retained[0]}") — the one legitimate dead-lead reason`, sol: null };
  }

  const notInterested = findMarkers(shortFields, NOT_INTERESTED_MARKERS);
  if (notInterested.length > 0) {
    return { verdict: "screened_out", screenReason: `prospect explicitly declined ("${notInterested[0]}")`, sol: null };
  }

  const excluded = tunables.caseTypesExcluded ?? [];
  if (lead.case_type && excluded.includes(lead.case_type)) {
    return {
      verdict: "screened_out",
      screenReason: `case type ${lead.case_type.replace(/_/g, " ")} is on the firm's excluded list`,
      sol: null,
    };
  }

  const state = tunables.geography?.state;
  if (state && lead.state && String(lead.state).toUpperCase() !== state) {
    return { verdict: "screened_out", screenReason: `lead is in ${lead.state}, outside the firm's ${state} geography`, sol: null };
  }

  // SOL: deterministic estimate from analysis/sol.mjs (never a computed
  // authoritative date — the disclaimer travels with the result).
  //
  // Gate rule (engine-v2 P0-2): screen out ONLY on the GENERAL statute computed
  // from an explicit incident date. A government defendant is an INFERRED fact
  // (note markers), so a blown 6-month claim window never screens a lead out —
  // late-claim relief exists (§946.6) and wrongful declines are the costliest
  // error. It surfaces as an urgency warning instead (see governmentWarning).
  const governmentHits = findMarkers(blob, GOVERNMENT_MARKERS);
  const sol = computeSol({
    incidentDate: lead.incident_date ?? null,
    caseType: lead.case_type ?? "unknown",
    governmentDefendant: false,
    now,
  });
  if (sol.urgency === "expired") {
    return {
      verdict: "screened_out",
      screenReason:
        `statute likely run — ${sol.ruleLabel ?? sol.applicable} (${sol.statute}), estimated deadline ${sol.deadlineDate}. ` +
        `Estimate only; an attorney must verify before final decline.`,
      sol,
    };
  }
  if (governmentHits.length > 0) {
    sol.notes = [
      ...(sol.notes ?? []),
      `possible government defendant ("${governmentHits[0]}") — the 6-month claims-notice window (Gov. Code §911.2) may apply; attorney review urgently`,
    ];
  }

  // Not callable / nothing to assess -> needs info, never silently dropped.
  if (!lead.prospect_phone) {
    return { verdict: "needs_info", screenReason: "no callback number in the export", sol };
  }
  if (!lead.case_type && !lead.incident_date && !norm(lead.notes)) {
    return { verdict: "needs_info", screenReason: "export carries no case facts to assess (no case type, incident date, or notes)", sol };
  }

  return { verdict: "rescue_candidate", screenReason: null, sol };
}

// --- the triage gap: WHY the cadence lost this lead ----------------------------

const TIMER_MARKERS = ["aged out", "auto-closed", "auto closed", "expired", "chase complete", "sequence complete", "no response"];
const NEVER_REACHED_MARKERS = ["no contact", "never reached", "unreachable", "no answer", "left voicemail", "voicemail only"];

export function classifyTriageGap(lead) {
  const blob = fieldsBlob(lead);

  if (norm(lead.language).startsWith("es") || findMarkers(blob, ["spanish", "espanol", "español"]).length > 0) {
    return {
      kind: "language_gap",
      basis: "Spanish-language lead — re-contact should be in Spanish. (Coverage gap only; language never changes the merit read.)",
    };
  }

  // Honest null: a MISSING attempt count is unknown, never "stopped too early".
  if (lead.attempts != null && Number(lead.attempts) <= 2) {
    return {
      kind: "stopped_too_early",
      basis: `only ${lead.attempts} contact attempt${Number(lead.attempts) === 1 ? "" : "s"} logged before the cadence quit — 93% of leads that convert are reached by the 6th attempt (Velocify, 3.5M-lead study)`,
    };
  }

  const neverReached = findMarkers(blob, NEVER_REACHED_MARKERS);
  if (neverReached.length > 0) {
    return { kind: "never_reached", basis: `no live contact ever made ("${neverReached[0]}")` };
  }

  const timer = findMarkers(blob, TIMER_MARKERS);
  if (timer.length > 0) {
    return {
      kind: "timer_expired",
      basis: `the cadence closed this lead on a timer ("${timer[0]}") — elapsed time, not a legal-merit review`,
    };
  }

  return { kind: "unknown_gap", basis: "the export doesn't record why follow-up stopped" };
}

// --- value TIER (never dollars) -------------------------------------------------

const HIGH_BASE_TYPES = new Set(["wrongful_death"]);
const ELEVATED_BASE_TYPES = new Set(["motorcycle", "pedestrian"]);

const INJURY_MARKERS = [
  "surgery",
  "fracture",
  "broken",
  "hospitalized",
  "hospital",
  "ambulance",
  "fatal",
  "killed",
  "death",
  "traumatic brain",
  "tbi",
  "amputat",
];
const COVERAGE_MARKERS = [
  "company truck",
  "commercial vehicle",
  "18-wheeler",
  "semi truck",
  "big rig",
  "delivery truck",
  "uber",
  "lyft",
  "rideshare",
  "bus",
];

function bump(tier) {
  const i = VALUE_TIERS.indexOf(tier);
  return VALUE_TIERS[Math.min(i + 1, VALUE_TIERS.length - 1)];
}

// Tier + cited basis. Markers can only RAISE a tier — nothing lowers it, and
// language/credibility/demographics are not inputs at all.
export function valueTier(lead) {
  const basis = [];
  let tier = "standard";

  if (lead.case_type && HIGH_BASE_TYPES.has(lead.case_type)) {
    tier = "high";
    basis.push(`case type ${lead.case_type.replace(/_/g, " ")}`);
  } else if (lead.case_type && ELEVATED_BASE_TYPES.has(lead.case_type)) {
    tier = "elevated";
    basis.push(`case type ${lead.case_type.replace(/_/g, " ")}`);
  }

  const injuries = findMarkers(lead.notes, INJURY_MARKERS);
  if (injuries.length > 0) {
    tier = bump(tier);
    basis.push(`objective-injury markers in notes: ${injuries.map((m) => `"${m}"`).join(", ")}`);
  }

  const coverage = findMarkers(lead.notes, COVERAGE_MARKERS);
  if (coverage.length > 0) {
    tier = bump(tier);
    basis.push(`coverage-path markers in notes: ${coverage.map((m) => `"${m}"`).join(", ")}`);
  }

  return {
    tier,
    basis: basis.length > 0 ? basis.join("; ") : "no value markers in the export — default tier",
  };
}

// --- recoverability (0..1, staleness-based, conservative) -----------------------

// Anchored to the callback science in ops/insights.md: Falkowitz retained 250
// of 1,000 nine-month-old dead leads (~25%); fresher is better, nothing is 0.
export function recoverabilityEstimate(lead, now = new Date()) {
  const ref = lead.last_contact_at ?? lead.lead_created_at ?? null;
  if (!ref) return { recoverability: 0.3, basis: "no contact dates in export — conservative default" };
  const days = Math.floor((new Date(now).getTime() - new Date(ref).getTime()) / 86_400_000);
  if (Number.isNaN(days) || days < 0) return { recoverability: 0.3, basis: "unparseable contact date — conservative default" };
  if (days <= 30) return { recoverability: 0.5, basis: `last touch ${days}d ago — still warm` };
  if (days <= 90) return { recoverability: 0.35, basis: `last touch ${days}d ago` };
  if (days <= 270) return { recoverability: 0.25, basis: `last touch ${days}d ago — ~25% of 9-month-old dead leads still retain (Falkowitz)` };
  return { recoverability: 0.15, basis: `last touch ${days}d ago — long cold, still worth one call` };
}

// --- the full triage read --------------------------------------------------------

// One deterministic pass over a normalized lead. The diagnosis line is what a
// staffer sees on the rescue list and what seeds the callback script.
export function triageLead(lead, { tunables = {}, now = new Date() } = {}) {
  const screened = screenLead(lead, { tunables, now });
  const sol = screened.sol;

  if (screened.verdict !== "rescue_candidate") {
    return {
      verdict: screened.verdict,
      screenReason: screened.screenReason,
      gap: null,
      valueTier: null,
      sol,
      recoverability: null,
      diagnosis: screened.screenReason,
      rubricVersion: TRIAGE_RUBRIC_VERSION,
    };
  }

  const gap = classifyTriageGap(lead);
  const value = valueTier(lead);
  const recover = recoverabilityEstimate(lead, now);

  const solNote =
    sol && sol.daysRemaining != null && (sol.urgency === "critical" || sol.urgency === "soon")
      ? ` SOL estimate: ~${sol.daysRemaining} days to the ${sol.ruleLabel ?? "statutory"} deadline — call first.`
      : "";

  return {
    verdict: "rescue_candidate",
    screenReason: null,
    gap,
    valueTier: value,
    sol,
    recoverability: recover,
    diagnosis: `${gap.basis}. Value tier ${value.tier} (${value.basis}).${solNote}`,
    rubricVersion: TRIAGE_RUBRIC_VERSION,
  };
}
