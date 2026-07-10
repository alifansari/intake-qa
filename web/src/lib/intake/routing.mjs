// ============================================================================
// Deterministic routing — the four terminal buckets. NO LLM ANYWHERE HERE.
//
// Every conversation ends in exactly one bucket, always with a next action
// ("no dead ends"). The rules are ordered: hard escalations first, then
// decline-by-design rules, then the scored book/handoff decision with a
// CONFIDENCE GATE (low confidence never declines — it hands off to a human).
//
// UPL note (guardrails.mjs): these buckets are OPERATIONAL ROUTING, not legal
// conclusions. "decline" means "the office reviews and closes politely", and
// its visitor-facing copy never states a conclusion about the merits — the
// SOL decline, for example, says a person will review it (exceptions exist:
// tolling, discovery rule), not that the claim is barred.
// ============================================================================

export const BUCKETS = ["book", "escalate", "human_handoff", "decline"];

// Routing confidence below this never books or declines — a human looks.
export const CONFIDENCE_GATE = 0.5;
// Scored confidence at/above this (plus matter-specific conditions) books.
export const BOOK_THRESHOLD = 0.6;

// --- SOL gate ----------------------------------------------------------------
// California general personal-injury filing window: 2 years (CCP §335.1).
// Government-entity claims require a notice much sooner (Gov. Code §911.2,
// ~6 months) — handled as an ESCALATION reason (gov_claims_notice), because
// time decay there is measured in weeks. "near" = within 90 days of the
// 2-year mark → escalate for time decay. This is a routing heuristic, not
// legal advice; exceptions (tolling, discovery rule, minors) are exactly why
// expired dates route to a captured decline WITH human review, never a
// dead end.
export const SOL_YEARS = 2;
export const SOL_NEAR_DAYS = 90;

export function solCheck(incidentDateISO, now = new Date()) {
  if (!incidentDateISO) return { status: "unknown", deadline: null };
  const incident = new Date(`${incidentDateISO}T00:00:00`);
  if (Number.isNaN(incident.getTime())) return { status: "unknown", deadline: null };
  const deadline = new Date(incident);
  deadline.setFullYear(deadline.getFullYear() + SOL_YEARS);
  const msLeft = deadline.getTime() - now.getTime();
  const daysLeft = msLeft / 86400000;
  if (daysLeft <= 0) return { status: "expired", deadline: deadline.toISOString().slice(0, 10) };
  if (daysLeft <= SOL_NEAR_DAYS)
    return { status: "near", deadline: deadline.toISOString().slice(0, 10) };
  return { status: "ok", deadline: deadline.toISOString().slice(0, 10) };
}

// --- Next actions (every bucket has one — no dead ends) -----------------------
export const NEXT_ACTIONS = {
  book: "Consultation gets scheduled — the office calls this number back within one business hour.",
  escalate: "Flagged for immediate attention — the on-call attorney is notified right away.",
  human_handoff: "A person from the office reviews this and calls back the same day.",
  decline:
    "A person at the office reviews every request before anything is closed — you'll hear back either way, and exceptions do exist.",
};

// --- Matter scoring (deterministic signals → confidence 0–1) ------------------
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function scoreMva(p) {
  let s = 0.5;
  const reasons = [];
  if (p.fault === "other") (s += 0.2), reasons.push("fault_other_driver");
  else if (p.fault === "me") (s -= 0.2), reasons.push("fault_self_reported");
  else if (p.fault === "shared" || p.fault === "unsure") s += 0.05;
  if (p.police_report === "yes") (s += 0.1), reasons.push("police_report");
  if (p.injured === "treated") (s += 0.2), reasons.push("injured_treated");
  else if (p.injured === "not_yet") (s += 0.1), reasons.push("injured_untreated");
  else if (p.injured === "no") (s -= 0.3), reasons.push("no_injury_reported");
  if (p.other_driver_insured === "yes") s += 0.1;
  else if (p.other_driver_insured === "no") (s -= 0.1), reasons.push("coverage_question");
  return { score: clamp01(s), reasons, injured: p.injured === "treated" || p.injured === "not_yet" };
}

function scorePremises(p) {
  let s = 0.5;
  const reasons = [];
  if (p.notice === "reported" || p.notice === "staff_knew") (s += 0.2), reasons.push("notice_indicated");
  else if (p.notice === "no") (s -= 0.15), reasons.push("notice_unclear");
  if (p.hazard_still_present === "still_there") (s += 0.1), reasons.push("evidence_available");
  if (p.injured === "treated") (s += 0.2), reasons.push("injured_treated");
  else if (p.injured === "not_yet") (s += 0.1), reasons.push("injured_untreated");
  else if (p.injured === "no") (s -= 0.3), reasons.push("no_injury_reported");
  return { score: clamp01(s), reasons, injured: p.injured === "treated" || p.injured === "not_yet" };
}

function scoreDogBite(p) {
  let s = 0.5;
  const reasons = [];
  if (p.owner_known === "known_acquaintance") (s += 0.25), reasons.push("owner_identified");
  else if (p.owner_known === "known_stranger") (s += 0.2), reasons.push("owner_identified");
  else if (p.owner_known === "unknown") (s -= 0.25), reasons.push("owner_unknown");
  if (p.owner_insurance === "likely") (s += 0.15), reasons.push("coverage_likely");
  else if (p.owner_insurance === "none") (s -= 0.1), reasons.push("coverage_question");
  if (p.injury_severity === "er" || p.injury_severity === "stitches")
    (s += 0.2), reasons.push("significant_injury");
  else if (p.injury_severity === "minor") s += 0.05;
  return { score: clamp01(s), reasons, injured: true };
}

// --- The router ---------------------------------------------------------------
// Called at a terminal node. `force` (from the tree's rule terminals) wins;
// otherwise: hard escalations → scored decision with the confidence gate.
export function routeLead(record, force = null) {
  const sol = solCheck(record.incident?.date);

  if (force) {
    return {
      bucket: force.bucket,
      confidence: 1, // deterministic rule, not a score
      reasons: [force.reason],
      next_action: NEXT_ACTIONS[force.bucket],
      sol,
    };
  }

  const p = record.path_data ?? {};
  const escalations = [];
  if (p.location_type === "government") escalations.push("gov_claims_notice");
  if (sol.status === "near") escalations.push("sol_near");
  if (p.victim_is_child === "yes") escalations.push("child_victim");
  if (escalations.length > 0) {
    return {
      bucket: "escalate",
      confidence: 1,
      reasons: escalations,
      next_action: NEXT_ACTIONS.escalate,
      sol,
    };
  }

  const scored =
    record.matter_type === "mva"
      ? scoreMva(p)
      : record.matter_type === "premises"
        ? scorePremises(p)
        : record.matter_type === "dog_bite"
          ? scoreDogBite(p)
          : { score: 0, reasons: ["unknown_matter"], injured: false };

  // Confidence gate: uncertain conversations go to a person, never to a
  // decline. Over-inclusion is the safe default.
  if (scored.score < CONFIDENCE_GATE) {
    return {
      bucket: "human_handoff",
      confidence: scored.score,
      reasons: [...scored.reasons, "low_confidence"],
      next_action: NEXT_ACTIONS.human_handoff,
      sol,
    };
  }

  if (scored.score >= BOOK_THRESHOLD && scored.injured) {
    return {
      bucket: "book",
      confidence: scored.score,
      reasons: scored.reasons,
      next_action: NEXT_ACTIONS.book,
      sol,
    };
  }

  return {
    bucket: "human_handoff",
    confidence: scored.score,
    reasons: [...scored.reasons, "needs_human_review"],
    next_action: NEXT_ACTIONS.human_handoff,
    sol,
  };
}

// Visitor-facing closing message per bucket. Factual, warm, no conclusions
// about merits, no urgency theater. The captured record travels regardless.
export function terminalMessage(record) {
  const name = record.contact?.first_name ? `${record.contact.first_name}, ` : "";
  switch (record.bucket) {
    case "book":
      return (
        `Thank you, ${name}I have everything the office needs. ` +
        `${NEXT_ACTIONS.book} If anything changes in the meantime, just call the office directly.`
      );
    case "escalate":
      return (
        `${name}I've marked this for immediate attention. ${NEXT_ACTIONS.escalate} ` +
        `Keep your phone nearby.`
      );
    case "human_handoff":
      return (
        `Thanks, ${name}I've saved everything you told me. ${NEXT_ACTIONS.human_handoff} ` +
        `Nothing you shared gets lost.`
      );
    case "decline":
      return (
        `Thank you for telling me all of this, ${name}I've passed it to the office. ` +
        `${NEXT_ACTIONS.decline}`
      );
    default:
      return `Thanks — everything you shared has been saved for the office.`;
  }
}
