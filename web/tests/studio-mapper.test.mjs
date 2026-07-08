// Tests for the DETERMINISTIC engine -> scorecard MAPPER. These lock the mapping
// from the frozen leak-audit engine's `scoring` object to the six rubric
// dimensions, the four Studio critical fails, the leakage inputs, and the
// auto-drafted narrative. The rubric MATH is tested in studio-rubric.test.mjs;
// here we test that the right engine SIGNALS land as the right rubric INPUTS.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapEngineToScorecard,
  deriveLeakageInputs,
  draftNarrativeFromEngine,
  CASE_TYPE_FEE_BENCHMARKS,
} from "../src/lib/studio/mapper.mjs";
import { computeSpotCheck } from "../src/lib/studio/rubric.mjs";

// A "strong call" engine output: high categories, no critical fails, clean
// conversation, lost-signable NOT fired, all four factors captured.
function strongScoring() {
  return {
    call_type: "new_pi_inquiry",
    critical_fails: [],
    qualification: {
      statute_window: { status: "captured", date_of_loss: "2026-03-14" },
    },
    conversion: {
      retainer_asked: true,
      next_step_specificity: "specific",
      contact_info_captured: "full",
    },
    alerts: { lost_signable_case: false },
    scores: {
      overall: 88,
      categories: {
        qualification: { score: 90, items: { A1: { score: 100 }, A2: { score: 100 }, A4: { score: 100 } } },
        conversion: { score: 90, items: { B1: { score: 100 }, B2: { score: 100 } } },
        connection: { score: 85, items: { C1: { score: 100 }, C2: { score: 100 } } },
        process: { score: 100, items: { E1: { score: 100 }, E3: { score: 100 } } },
      },
    },
    summary: "Strong new PI inquiry, well qualified and signed.",
  };
}

// --- Dimension mapping ------------------------------------------------------

test("strong call maps to high conversation dims; front-door Not assessed → still A", () => {
  const { dimensionInputs, criticalFails } = mapEngineToScorecard(
    strongScoring(),
    "Thanks for calling, let me get some details about your accident.",
  );
  // Front door is NOT assessed on a connected intake conversation (no genuine
  // signal): null, not a defaulted 100.
  assert.equal(dimensionInputs.reachability_speed, null);
  assert.equal(dimensionInputs.human_vs_barrier, null);
  assert.equal(dimensionInputs.rapport_trauma, 100);
  assert.equal(dimensionInputs.legal_danger_flags, 100); // A2 = 100
  assert.equal(dimensionInputs.capture, 100); // A1 + E1 both 100
  assert.equal(dimensionInputs.follow_up, 100); // B2 specific
  assert.deepEqual(criticalFails, []);
  const spot = computeSpotCheck({ dimensionInputs, criticalFails });
  // Renormalized over the 60-weight conversation remainder (front-door excluded).
  assert.equal(spot.score, 100);
  assert.equal(spot.grade, "A");
  assert.equal(spot.assessedWeight, 60);
});

test("reachability: no front-door signal -> Not assessed (null); real cues DO assess it", () => {
  const s = strongScoring();
  const one = mapEngineToScorecard(s, "Please hold while I connect you.");
  assert.equal(one.dimensionInputs.reachability_speed, 50); // one cue -> assessed partial
  const many = mapEngineToScorecard(s, "Please hold. Let me transfer you. Press 1 for English.");
  assert.equal(many.dimensionInputs.reachability_speed, 0); // 2+ cues -> assessed poor
  const clean = mapEngineToScorecard(s, "Tell me what happened.");
  assert.equal(clean.dimensionInputs.reachability_speed, null); // no cues -> Not assessed
  assert.equal(clean.dimensionInputs.human_vs_barrier, null); // shares the one signal
});

test("voicemail_or_no_contact means no human engaged -> reachability 0", () => {
  const s = { ...strongScoring(), call_type: "voicemail_or_no_contact" };
  const { dimensionInputs } = mapEngineToScorecard(s, "");
  assert.equal(dimensionInputs.reachability_speed, 0);
  assert.equal(dimensionInputs.human_vs_barrier, 0);
});

test("rapport is driven by Category C, lifted by a strong peak-end (E3)", () => {
  const s = strongScoring();
  s.scores.categories.connection.score = 55; // borderline -> would snap to 50
  s.scores.categories.process.items.E3 = { score: 100 }; // strong close lifts it
  const { dimensionInputs } = mapEngineToScorecard(s, "hi");
  assert.equal(dimensionInputs.rapport_trauma, 100);
});

test("legal_danger floors at 0 when CF-1 (SOL) fires", () => {
  const s = strongScoring();
  s.critical_fails = [{ code: "CF-1", name: "sol_mishandling", evidence_quote: "..." }];
  const { dimensionInputs } = mapEngineToScorecard(s, "hi");
  assert.equal(dimensionInputs.legal_danger_flags, 0);
});

test("legal_danger floors at 0 when CF-2 (UPL) fires", () => {
  const s = strongScoring();
  s.critical_fails = [{ code: "CF-2", name: "legal_advice_upl", evidence_quote: "It's a slam dunk." }];
  const { dimensionInputs } = mapEngineToScorecard(s, "hi");
  assert.equal(dimensionInputs.legal_danger_flags, 0);
});

test("capture reflects both four-factor coverage (A1) and contact capture (E1)", () => {
  const s = strongScoring();
  s.scores.categories.qualification.items.A1 = { score: 100 };
  s.scores.categories.process.items.E1 = { score: 0 }; // no callback captured
  s.conversion.contact_info_captured = "none";
  const { dimensionInputs } = mapEngineToScorecard(s, "hi");
  // mean(100, 0) = 50 -> snap 50 (a well-qualified call that captured no callback still leaks)
  assert.equal(dimensionInputs.capture, 50);
});

test("follow_up reflects next-step specificity (B2 / conversion.next_step_specificity)", () => {
  const s = strongScoring();
  delete s.scores.categories.conversion.items.B2;
  s.conversion.next_step_specificity = "none";
  s.conversion.retainer_asked = false;
  delete s.scores.categories.conversion.items.B1;
  const { dimensionInputs } = mapEngineToScorecard(s, "hi");
  assert.equal(dimensionInputs.follow_up, 0);
});

// --- Critical-fail mapping --------------------------------------------------

test("CF-2 -> non_lawyer_legal_opinion; CF-5 -> rude_dismissive", () => {
  const s = strongScoring();
  s.critical_fails = [
    { code: "CF-2", name: "legal_advice_upl", evidence_quote: "your case is worth 100k" },
    { code: "CF-5", name: "hostile_or_discriminatory_conduct", evidence_quote: "don't waste my time" },
  ];
  const { criticalFails } = mapEngineToScorecard(s, "hi");
  assert.ok(criticalFails.includes("non_lawyer_legal_opinion"));
  assert.ok(criticalFails.includes("rude_dismissive"));
});

test("lost_signable_case alert -> premature_disqualification", () => {
  const s = strongScoring();
  s.alerts.lost_signable_case = true;
  const { criticalFails } = mapEngineToScorecard(s, "hi");
  assert.ok(criticalFails.includes("premature_disqualification"));
});

test('graceful-decline "you have no case" -> premature_disqualification', () => {
  const s = strongScoring();
  const { criticalFails } = mapEngineToScorecard(s, "Honestly, you have no case here, sorry.");
  assert.ok(criticalFails.includes("premature_disqualification"));
});

test("coverage-misstatement subset of CF-2 -> coverage_misstatement", () => {
  const s = strongScoring();
  s.critical_fails = [
    { code: "CF-2", name: "legal_advice_upl", evidence_quote: "You're not covered under that policy." },
  ];
  const { criticalFails } = mapEngineToScorecard(s, "hi");
  assert.ok(criticalFails.includes("non_lawyer_legal_opinion"));
  assert.ok(criticalFails.includes("coverage_misstatement"));
});

test("coverage_misstatement does NOT fire without a CF-2", () => {
  const s = strongScoring();
  // coverage cue in transcript but no CF-2 flagged -> we do not invent the fail.
  const { criticalFails } = mapEngineToScorecard(s, "you're not covered under that policy");
  assert.ok(!criticalFails.includes("coverage_misstatement"));
});

test("critical fails de-duplicate and only emit valid Studio keys", () => {
  const s = strongScoring();
  s.critical_fails = [
    { code: "CF-2", name: "legal_advice_upl", evidence_quote: "no coverage for you" },
    { code: "CF-2", name: "legal_advice_upl", evidence_quote: "definitely at fault" },
  ];
  const { criticalFails } = mapEngineToScorecard(s, "hi");
  const seen = new Set(criticalFails);
  assert.equal(seen.size, criticalFails.length); // no dupes
  for (const k of criticalFails) {
    assert.ok(
      ["non_lawyer_legal_opinion", "premature_disqualification", "coverage_misstatement", "rude_dismissive"].includes(k),
    );
  }
});

// --- Leakage derivation -----------------------------------------------------

test("leakage uses the engine's revenue_at_risk amount as the low anchor", () => {
  const s = strongScoring();
  s.alerts.revenue_at_risk = { amount_usd: 45000, case_type_matched: "mva_commercial" };
  const leak = deriveLeakageInputs(s);
  assert.equal(leak.average_signed_case_fee, 45000);
  assert.equal(leak.case_type_matched, "mva_commercial");
  assert.equal(leak.illustrative_monthly_recurrence, 1);
  assert.equal(leak.basis, "engine_firm_average_fee_for_case_type");
});

test("leakage falls back to the benchmark table for the detected case type", () => {
  const s = strongScoring();
  s.case_type_matched = "dog_bite"; // no revenue_at_risk amount present
  const leak = deriveLeakageInputs(s);
  assert.equal(leak.average_signed_case_fee, CASE_TYPE_FEE_BENCHMARKS.dog_bite);
  assert.equal(leak.basis, "benchmark_low_anchor_for_case_type");
});

test("leakage stays blank (honest) when there is no fee signal at all", () => {
  const leak = deriveLeakageInputs({});
  assert.equal(leak.average_signed_case_fee, null);
  assert.equal(leak.illustrative_monthly_recurrence, 1);
});

test("case-type benchmark lookup is lenient on separators/case", () => {
  const leak = deriveLeakageInputs({ case_type_matched: "MVA Standard" });
  assert.equal(leak.average_signed_case_fee, CASE_TYPE_FEE_BENCHMARKS.mva_standard);
});

// --- Narrative auto-draft (deterministic fallback, no LLM) -------------------

test("narrative draft uses the engine one_thing (behavior + model utterance)", () => {
  const s = strongScoring();
  s.coaching = {
    one_thing: {
      behavior: "Ask for the retainer before the call ends.",
      why_it_matters: "A specific ask is the strongest conversion behavior.",
      model_utterance: "I can text you the agreement right now.",
    },
  };
  const n = draftNarrativeFromEngine(s);
  assert.match(n.narrative_failure, /retainer/i);
  assert.match(n.narrative_fix, /text you the agreement/i);
});

test("narrative draft never uses recording/recorded language (hard rule #1)", () => {
  const s = strongScoring();
  s.alerts.lost_signable_case = true;
  s.coaching = {};
  const n = draftNarrativeFromEngine(s);
  assert.doesNotMatch(n.narrative_failure, /record(ed|ing)/i);
  assert.doesNotMatch(n.narrative_fix, /record(ed|ing)/i);
});

test("narrative draft returns empty strings (not fabricated prose) with no signal", () => {
  const n = draftNarrativeFromEngine({});
  assert.equal(n.narrative_failure, "");
  assert.equal(n.narrative_fix, "");
});

// --- End-to-end: a lost-signable call produces a finalizable, capped result ---

test("a lost-signable call: premature_disqualification caps grade at F, leakage derived", () => {
  const s = strongScoring();
  s.alerts.lost_signable_case = true;
  s.alerts.revenue_at_risk = { amount_usd: 12000, case_type_matched: "mva_standard" };
  const { dimensionInputs, criticalFails, leakageInputs } = mapEngineToScorecard(s, "hi");
  const spot = computeSpotCheck({ dimensionInputs, criticalFails });
  assert.ok(criticalFails.includes("premature_disqualification"));
  assert.equal(spot.grade, "F"); // critical-fail override
  assert.equal(leakageInputs.average_signed_case_fee, 12000);
});
