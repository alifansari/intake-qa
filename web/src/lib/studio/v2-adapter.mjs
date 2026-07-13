// web/src/lib/studio/v2-adapter.mjs — Engine v2 verdict → product ScoredCall.
//
// THE CUTOVER BRIDGE. The product (schema, flag-logic, dashboards, recovery
// workflow) consumes the v1 ScoredCall shape. Engine v2 is a TRIAGE engine —
// it emits a disposition + tiers + cited reads, NOT a rep-handling score and
// NOT dollars. This adapter maps a v2 verdict onto the ScoredCall contract so
// the whole product keeps working, now powered by v2, WITHOUT reintroducing
// anything v2's compliance rails forbid.
//
// COMPLIANCE (non-negotiable, compliance-invariants is supreme):
//   * NO dollar figure at intake. We never synthesize revenue_at_risk.amount_usd.
//     The recovery card already renders a case type with NO fee when absent
//     (flag-logic.mjs: "we never fabricate a range") — so this is a no-op there.
//   * NO computed deadline dates. Only v2's urgency FLAGS pass through.
//   * NO terminal decision. Every disposition is a recommendation; abstained
//     and attorney_review_required route to a human.
//
// SEMANTIC BRIDGE (documented, inspectable — "no citation, no claim"):
//   * case_signability  ← v2 recommended_disposition (the triage answer).
//   * scores.overall    ← v2 question-capture coverage (the rep-handling proxy,
//     the closest v2 analog to v1's handling score) — NOT a triage or dollar
//     number. Labeled as such in scores.basis.
//   * alerts.lost_signable_case ← signable disposition AND the rep did not move
//     to sign (the leaked-signable definition, unchanged).
//   * The FULL v2 verdict rides along under `.v2` (passthrough) so richer
//     surfaces can show dispositions, tiers, gates, and cited reads directly.
// Pure, no I/O, unit-tested. .mjs so Node test + Next runtime import with no build.

function obj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
function str(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Map the v2 disposition to the product’s categorical signability. refer_out is
// a meritorious-but-not-for-this-firm case → needs_development (not a decline,
// not a this-firm re-engage). Abstained/attorney-review → needs_development
// (route to a human; never auto-declinable).
export function dispositionToSignability(disposition) {
  switch (disposition) {
    case "sign_now":
      return "likely_signable";
    case "develop":
      return "needs_development";
    case "refer_out":
      return "needs_development";
    case "decline_with_grace":
      return "likely_declinable";
    default:
      return "needs_development"; // null/abstained
  }
}

// Rep-handling proxy 0-100 from question-capture coverage (never a dollar,
// never the triage read). Falls back to the confidence tier when capture math
// is unavailable.
export function repHandlingScore(verdict) {
  const conf = obj(verdict.confidence);
  const observ = obj(conf.observability);
  const ratio = observ.question_capture_ratio;
  if (typeof ratio === "number" && ratio >= 0 && ratio <= 1) {
    return Math.round(ratio * 100);
  }
  const tier = conf.tier;
  return tier === "high" ? 85 : tier === "low" ? 45 : 65;
}

// Did the rep move to sign on the call? Read the v2 rep_committing_action fact.
export function repCommitted(verdict) {
  const facts = obj(verdict.facts);
  const v = obj(facts.rep_committing_action).value;
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (!s) return false;
  if (/\b(no ask|no move|none|did not|didn’t|no close|no retainer|no e-?sign)\b/.test(s))
    return false;
  return /\b(sign|close|retainer|e-?sign|esign|booked|callback set|hard close|offered)\b/.test(s);
}

// The one mapping. Returns a ScoredCall-compatible object (schema.ts passthrough).
export function v2VerdictToScoredCall(verdict) {
  const v = obj(verdict);
  const rec = obj(v.recommendation);
  const tiers = obj(v.tiers);
  const conf = obj(v.confidence);
  const disposition = rec.recommended_disposition ?? null;
  const signability = dispositionToSignability(disposition);
  const caseType = str(rec.case_type) || str(obj(obj(v.facts).case_type_primary).value);

  const signable = signability === "likely_signable";
  const leaked = signable && !repCommitted(v);

  // critical fails: the catastrophe gates that fired (G1/G2/G4). G3 never fires
  // a cap and is not a "fail" — it is an attorney-review flag.
  const gates = obj(v.gates);
  const criticalFails = ["g1_underwater", "g2_deadline_trap", "g4_trial_capital"]
    .filter((g) => obj(gates[g]).fired)
    .map((g) => ({ gate: g, rationale: obj(gates[g]).rationale || null }));

  return {
    call_id: v.call_id,
    call_type: str(v.call_type) || undefined,
    language: str(obj(v.transcript_quality).language) || undefined,
    case_signability: signability,
    critical_fails: criticalFails,
    scores: {
      overall: repHandlingScore(v),
      band: str(tiers.value_tier) || undefined,
      confidence: ["high", "medium", "low"].includes(conf.tier) ? conf.tier : "medium",
      basis:
        "Handling proxy from v2 question-capture coverage (rep coaching backbone). " +
        "It is NOT the triage read (see case_signability / .v2.recommendation) and NOT a dollar figure.",
      categories: {}, // v2 does not grade rubric categories; scorecard mapper DEFAULTS these.
    },
    alerts: {
      lost_signable_case: leaked,
      missed_development_opportunity: disposition === "develop",
      // NO amount_usd — v2 forbids a dollar at intake. Case type + tier basis only.
      revenue_at_risk: {
        case_type_matched: caseType || undefined,
        basis: tiers.value_tier ? `value tier: ${tiers.value_tier} (tier only — no dollar at intake)` : undefined,
      },
    },
    summary: str(rec.prior_context) || str((rec.disposition_basis || [])[0]) || undefined,
    // Engine identity + the full triage verdict, carried through for the
    // richer studio/desk surfaces that render v2 natively.
    engine: "scoring-v2",
    schema_version: v.schema_version || "2.2",
    abstained: v.abstained === true,
    attorney_review_required: rec.attorney_review_required === true,
    v2: {
      recommended_disposition: disposition,
      value_tier: tiers.value_tier,
      effort_tier: tiers.effort_tier,
      carry_tier: tiers.carry_tier,
      capital_tier: tiers.capital_tier,
      case_type_routing: rec.case_type_routing,
      prior_context: rec.prior_context,
      lien_context: rec.lien_context,
      develop_payload: rec.develop_payload,
      refer_comparison: rec.refer_comparison,
      urgency_flags: rec.urgency_flags,
      disposition_basis: rec.disposition_basis,
      gates: v.gates,
      dimension_reads: v.dimension_reads,
      confidence: v.confidence,
      call_quality: v.call_quality,
      citations: v.citations,
    },
  };
}
