// ============================================================================
// Engine → Spot Check scorecard MAPPER (pure, deterministic, unit-tested).
//
// The Spot Check scorecard USED TO be hand-filled: the founder set the six
// rubric dimensions, checked the critical fails, typed the leakage inputs, and
// approved an AI narrative. This module makes the scorecard BUILD ITSELF: it
// reads the frozen leak-audit engine's analysis of the uploaded intake call
// (the `scoring` object persisted on studio_recordings) and DETERMINISTICALLY
// derives every scorecard input. The founder can review/override, but nothing
// requires manual entry.
//
// IMPORTANT — what stays pure vs. what changed:
//   * The rubric MATH (rubric.mjs) is unchanged and still 100% deterministic.
//   * What changed is where its INPUTS come from: previously the founder's
//     keystrokes, now this mapper's deterministic read of the engine analysis.
//   * The engine analysis itself uses the LLM (Claude scores the transcript).
//     So the headline number is now DERIVED FROM AN LLM-PRODUCED ANALYSIS,
//     mapped deterministically — a deliberate change from the prior
//     "no LLM anywhere near the number" stance. The mapping below is the audit
//     trail for exactly how each engine signal becomes a rubric input.
//
// Every mapping cites the engine field it reads and the rubric level it emits,
// per compliance-invariants §IV ("no citation, no claim") — the derivation is
// inspectable, and where the engine simply does not measure a dimension we say
// so and default with a documented rationale (marked DEFAULTED below).
//
// Authored as .mjs so the node --test runner and the Next runtime both import it
// with zero build step (repo pattern); mapper.ts re-exports with types.
// ============================================================================

// ---------------------------------------------------------------------------
// Small lenient readers over the frozen, passthrough scoring object. We never
// assume a field exists — a real hand-scored file must drop in unchanged.
// ---------------------------------------------------------------------------
function obj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
function arr(v) {
  return Array.isArray(v) ? v : [];
}
function str(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Read a Category / item score out of scores.categories.<cat>.items.<item>.score.
// Items are 0 / 50 / 100 or "n/a" per the system prompt. Returns a number or null
// (null = not applicable / not present, so it doesn't drag a dimension down).
function itemScore(scoring, category, item) {
  const cats = obj(obj(obj(scoring).scores).categories);
  const items = obj(obj(cats[category]).items);
  const raw = obj(items[item]).score;
  const n = num(raw);
  return n === 0 || n === 50 || n === 100 ? n : null;
}
function categoryScore(scoring, category) {
  const cats = obj(obj(obj(scoring).scores).categories);
  return num(obj(cats[category]).score);
}

// Snap an arbitrary 0–100 category score to the rubric's coarse 0/50/100 scale.
// >=75 -> 100 (strong), >=40 -> 50 (partial), else 0. Thresholds mirror the
// engine's own bands (75-89 strong, 40-59 needs coaching) so the coarse mapping
// tracks the fine one.
function snap(score) {
  if (score == null) return null;
  if (score >= 75) return 100;
  if (score >= 40) return 50;
  return 0;
}

// The best of several item scores, ignoring nulls (n/a). Used where a dimension
// is backed by more than one rubric item.
function bestOf(...vals) {
  const present = vals.filter((v) => v != null);
  if (present.length === 0) return null;
  return Math.max(...present);
}

// Detect an engine critical fail by CF code (e.g. "CF-2") or by its snake_case
// name (e.g. "legal_advice_upl"). Returns the matching entries (with quotes).
function criticalFailEntries(scoring) {
  return arr(obj(scoring).critical_fails).map(obj);
}
function hasCF(scoring, code, name) {
  return criticalFailEntries(scoring).some((f) => {
    const c = str(f.code);
    const n = str(f.name);
    return (c && c.toUpperCase() === code) || (n && n.toLowerCase() === name);
  });
}

// ---------------------------------------------------------------------------
// Transcript cues used only where the engine does not directly score the phone
// tree (reachability / human-vs-barrier). The engine scores the CONNECTED
// conversation, not the IVR, so a recorded intake conversation means a human
// engaged: default Good, downgraded only on explicit barrier cues in the text.
// ---------------------------------------------------------------------------
const BARRIER_CUES = [
  "please hold",
  "on hold",
  "transfer you",
  "transferring you",
  "let me transfer",
  "press 1",
  "press one",
  "voicemail",
  "leave a message",
  "our menu",
  "for english",
  "para español",
  "para espanol",
  "the next available",
  "wait time",
  "hold time",
];

function barrierPressure(transcript) {
  const t = typeof transcript === "string" ? transcript.toLowerCase() : "";
  if (!t) return 0;
  let hits = 0;
  for (const cue of BARRIER_CUES) if (t.includes(cue)) hits += 1;
  return hits;
}

// ---------------------------------------------------------------------------
// PER-DIMENSION MAPPING. Each returns 0 / 50 / 100. Comments name the engine
// field(s) read and mark DEFAULTED where the engine lacks a real signal.
// ---------------------------------------------------------------------------

// reachability_speed & human_vs_barrier (DEFAULTED, cue-downgraded).
// The frozen engine scores the connected conversation, not the phone tree, so it
// carries NO direct reachability/hold-time signal. A recorded intake CONVERSATION
// is itself evidence a human engaged → default 100 (Good). We downgrade ONLY on
// explicit hold/transfer/IVR-struggle cues in the transcript:
//   0 barrier cues  -> 100 (human engaged, no friction seen)
//   1 barrier cue   -> 50  (some friction: a hold or transfer happened)
//   2+ barrier cues -> 0   (repeated barriers / IVR struggle)
// Both dimensions share this signal (there is only one). This is the weakest-
// evidence pair in the map — flagged as DEFAULTED for the founder to override.
function mapReachability(scoring, transcript) {
  // voicemail_or_no_contact means NO live human conversation occurred.
  const callType = str(obj(scoring).call_type);
  if (callType === "voicemail_or_no_contact") return 0;
  const cues = barrierPressure(transcript);
  if (cues >= 2) return 0;
  if (cues === 1) return 50;
  return 100;
}

// rapport_trauma — STRONGLY DERIVED from Category C (connection & empathy:
// reflective listening, event acknowledgment, orienting, pacing) plus E3
// (peak-end close). We take the connection category score, snapped to 0/50/100,
// and let a strong peak-end lift a borderline call.
function mapRapport(scoring) {
  const c = snap(categoryScore(scoring, "connection"));
  const e3 = itemScore(scoring, "process", "E3"); // peak-end close
  return bestOf(c, e3 === 100 ? 100 : null) ?? c ?? 0;
}

// legal_danger_flags — STRONGLY DERIVED. Hard floor at 0 if the engine fired
// CF-1 (SOL mishandling) or CF-2 (UPL/legal advice); otherwise from Category A2
// (date-of-loss precision) as the SOL-capture proxy, with A4 (recovery source)
// as a secondary lift. CF-1/CF-2 are the two flags that make an intake call
// legally dangerous, so their presence dominates.
function mapLegalDanger(scoring) {
  if (hasCF(scoring, "CF-1", "sol_mishandling")) return 0;
  if (hasCF(scoring, "CF-2", "legal_advice_upl")) return 0;
  const a2 = itemScore(scoring, "qualification", "A2"); // date-of-loss precision
  if (a2 != null) return a2;
  // No A2 measured (e.g. non-case call): fall back to whether a date-of-loss was
  // captured in the qualification block.
  const stat = obj(obj(obj(scoring).qualification).statute_window);
  const status = str(stat.status);
  if (status === "captured") return 100;
  if (status === "partially_captured" || status === "caller_volunteered") return 50;
  return 50; // DEFAULTED: absent an explicit SOL signal, neutral-partial (no fail fired).
}

// capture — STRONGLY DERIVED from Category A1 (four-factor coverage) AND E1
// (contact capture). Both matter: A1 is "did we qualify the case", E1 is "can we
// call them back". We take the LOWER-leaning combination: a call that qualified
// well but captured no callback still leaks, so E1 gates it.
function mapCapture(scoring) {
  const a1 = itemScore(scoring, "qualification", "A1"); // four-factor coverage
  const e1 = itemScore(scoring, "process", "E1"); // contact capture
  // Also read the structured conversion.contact_info_captured as a fallback for E1.
  const contact = str(obj(obj(scoring).conversion).contact_info_captured);
  const contactLevel =
    contact === "full" ? 100 : contact === "partial" ? 50 : contact === "none" ? 0 : null;
  const capture = bestOf(e1, contactLevel);
  // Average A1 (qualification) and capture (contact), snapped to the coarse scale.
  const parts = [a1, capture].filter((v) => v != null);
  if (parts.length === 0) return 0;
  const mean = parts.reduce((s, v) => s + v, 0) / parts.length;
  return snap(mean) ?? 0;
}

// follow_up — STRONGLY DERIVED from Category B2 (next-step specificity) and the
// structured conversion fields (retainer_asked / next_step_specificity). This is
// the "did the call end with a real next step" dimension.
function mapFollowUp(scoring) {
  const b2 = itemScore(scoring, "conversion", "B2"); // next-step specificity
  const conv = obj(obj(scoring).conversion);
  const nss = str(conv.next_step_specificity);
  const nssLevel = nss === "specific" ? 100 : nss === "vague" ? 50 : nss === "none" ? 0 : null;
  const b1 = itemScore(scoring, "conversion", "B1"); // the ask (retainer)
  const base = bestOf(b2, nssLevel);
  if (base == null && b1 == null) return 0;
  // A strong ask (B1=100) can lift a vague next step by one notch, but never
  // above the next-step signal's own ceiling behavior; keep it simple: take the
  // best of next-step and ask.
  return bestOf(base, b1) ?? 0;
}

// ---------------------------------------------------------------------------
// CRITICAL FAILS — map engine flags to the four Studio critical-fail keys.
//   CF-2 legal_advice_upl              -> non_lawyer_legal_opinion
//   CF-5 hostile_or_discriminatory     -> rude_dismissive
//   lost_signable_case OR graceful     -> premature_disqualification
//     "you have no case" decline
//   CF-2 coverage-misstatement subset  -> coverage_misstatement
// A checked Studio critical fail caps the grade at F (rubric override).
// ---------------------------------------------------------------------------
const COVERAGE_MISSTATEMENT_CUES = [
  "not covered",
  "no coverage",
  "your policy doesn't",
  "you're not covered",
  "won't be covered",
  "isn't covered",
  "coverage doesn't apply",
];
const YOU_HAVE_NO_CASE_CUES = [
  "you have no case",
  "you don't have a case",
  "there's no case here",
  "nothing we can do",
  "you don't have a claim",
];

function mapCriticalFails(scoring, transcript) {
  const out = [];
  const t = typeof transcript === "string" ? transcript.toLowerCase() : "";
  const cfEntries = criticalFailEntries(scoring);

  // CF-2 UPL -> non_lawyer_legal_opinion
  if (hasCF(scoring, "CF-2", "legal_advice_upl")) out.push("non_lawyer_legal_opinion");

  // CF-5 hostile/discriminatory -> rude_dismissive
  if (hasCF(scoring, "CF-5", "hostile_or_discriminatory_conduct")) out.push("rude_dismissive");

  // premature_disqualification: the engine's flagship lost-signable alert, OR a
  // graceful-decline that crossed into "you have no case" territory (the system
  // prompt explicitly warns against "you have no case" phrasing).
  const lostSignable = obj(obj(scoring).alerts).lost_signable_case === true;
  const noCasePhrase = YOU_HAVE_NO_CASE_CUES.some((c) => t.includes(c));
  if (lostSignable || noCasePhrase) out.push("premature_disqualification");

  // coverage_misstatement: a subset of CF-2 where the misstatement is specifically
  // about insurance coverage. Detected from the CF-2 evidence quote (preferred) or
  // an explicit coverage-denial cue in the transcript. Only fires alongside a CF-2.
  if (hasCF(scoring, "CF-2", "legal_advice_upl")) {
    const cf2Quotes = cfEntries
      .filter((f) => {
        const c = str(f.code);
        const n = str(f.name);
        return (c && c.toUpperCase() === "CF-2") || (n && n.toLowerCase() === "legal_advice_upl");
      })
      .map((f) => (str(f.evidence_quote) || str(f.quote) || "").toLowerCase())
      .join(" ");
    const coverageInQuote = COVERAGE_MISSTATEMENT_CUES.some((c) => cf2Quotes.includes(c));
    const coverageInTranscript = COVERAGE_MISSTATEMENT_CUES.some((c) => t.includes(c));
    if (coverageInQuote || coverageInTranscript) out.push("coverage_misstatement");
  }

  // De-dupe, preserve order.
  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// LEAKAGE — average_signed_case_fee auto-derived from the engine's per-case-type
// fee benchmark for the detected case type. The engine emits a single point fee
// (a FIRM CONFIG table lookup) on a lost-signable alert; per web/analysis/
// fee-value.mjs we treat that point as the CONSERVATIVE LOW anchor ("quote the
// low"). When the engine did not fire an alert (no amount), we fall back to a
// documented per-case-type benchmark table that mirrors the system prompt's
// stated fallback defaults. illustrative_monthly_recurrence defaults to 1.
// The founder can override both.
// ---------------------------------------------------------------------------

// Fallback per-case-type fee benchmarks (USD), verbatim from the system prompt's
// stated fallback defaults (STEP 3D). These are the LOW/anchor values; a firm's
// own FIRM CONFIG values take precedence and already flow through amount_usd.
export const CASE_TYPE_FEE_BENCHMARKS = {
  mva_standard: 12000,
  mva_commercial: 45000,
  premises: 18000,
  dog_bite: 15000,
  wrongful_death: 150000,
};

// Normalize a case-type string to a benchmark key (lenient on separators/case).
function benchmarkForCaseType(caseType) {
  const key = str(caseType);
  if (!key) return null;
  const norm = key.toLowerCase().replace(/[\s-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(CASE_TYPE_FEE_BENCHMARKS, norm)) {
    return CASE_TYPE_FEE_BENCHMARKS[norm];
  }
  return null;
}

export function deriveLeakageInputs(scoring) {
  const s = obj(scoring);
  const rar = obj(obj(s.alerts).revenue_at_risk);

  // 1) Prefer the engine's own per-call fee estimate (FIRM CONFIG-driven) — the
  //    conservative low anchor.
  const engineFee = num(rar.amount_usd);

  // 2) Detected case type: from revenue_at_risk first, else any top-level field.
  const caseType =
    str(rar.case_type_matched) ||
    str(s.case_type_matched) ||
    str(obj(s.alerts).case_type_matched) ||
    null;

  let fee = engineFee != null && engineFee >= 0 ? engineFee : null;
  let basis = fee != null ? "engine_firm_average_fee_for_case_type" : null;

  // 3) Fall back to the documented benchmark table for the detected case type.
  if (fee == null) {
    const bench = benchmarkForCaseType(caseType);
    if (bench != null) {
      fee = bench;
      basis = "benchmark_low_anchor_for_case_type";
    }
  }

  return {
    average_signed_case_fee: fee, // null when the engine gives no signal (editable; honest blank)
    illustrative_monthly_recurrence: 1, // DEFAULTED: one illustrative recurrence/mo, founder-editable
    case_type_matched: caseType,
    basis, // provenance of the fee (for the audit trail / not printed)
  };
}

// ---------------------------------------------------------------------------
// THE MAPPER — engine `scoring` (+ optional transcript for the cue-based
// dimensions) → the three scorecard input bundles. Pure; no I/O.
// ---------------------------------------------------------------------------
export function mapEngineToScorecard(scoring, transcript = "") {
  const s = obj(scoring);

  const dimensionInputs = {
    reachability_speed: mapReachability(s, transcript),
    human_vs_barrier: mapReachability(s, transcript), // shares the one available signal
    rapport_trauma: mapRapport(s),
    legal_danger_flags: mapLegalDanger(s),
    capture: mapCapture(s),
    follow_up: mapFollowUp(s),
  };

  const criticalFails = mapCriticalFails(s, transcript);
  const leakageInputs = deriveLeakageInputs(s);

  return { dimensionInputs, criticalFails, leakageInputs };
}

// ---------------------------------------------------------------------------
// DETERMINISTIC NARRATIVE FALLBACK — drafts the two narrative fields from the
// engine's flagged failure + evidence quotes, with NO LLM. Used to AUTO-DRAFT on
// population so a scorecard is finalizable without a manual click. (The Anthropic
// draft route still exists for a richer rewrite; this guarantees a grounded draft
// exists even when the API is unconfigured.) Every claim traces to an engine
// field — no fabricated quotes (compliance-invariants §IV). Says "intake call",
// never "recording" (hard rule #1: no recording language in audit output).
// ---------------------------------------------------------------------------
export function draftNarrativeFromEngine(scoring) {
  const s = obj(scoring);
  const coaching = obj(s.coaching);
  const oneThing = obj(coaching.one_thing);
  const summary = str(s.summary);

  // narrative_failure: prefer the engine's own single-most-important miss
  // (one_thing), else the flagged critical fail / lost-signable alert, else the
  // summary. Grounded, non-alarmist, no score mentioned.
  let failure = null;
  const behavior = str(oneThing.behavior);
  const why = str(oneThing.why_it_matters);
  if (behavior) {
    failure = why ? `${behavior} ${why}` : behavior;
  } else {
    const cf = criticalFailEntries(s).map((f) => str(f.explanation) || str(f.name)).filter(Boolean);
    if (cf.length) failure = `The intake call showed a critical issue: ${cf[0]}.`;
    else if (obj(s.alerts).lost_signable_case === true)
      failure =
        "A plausibly signable case reached the end of the intake call without a clear move to sign or a specific next step.";
    else if (summary) failure = summary;
  }

  // narrative_fix: prefer the engine's model utterance / do-instruction.
  let fix = null;
  const model = str(oneThing.model_utterance);
  if (behavior && model) {
    fix = `${behavior} For example: "${model}"`;
  } else if (behavior) {
    fix = behavior;
  } else if (model) {
    fix = `For example: "${model}"`;
  }

  return {
    narrative_failure: failure ?? "",
    narrative_fix: fix ?? "",
  };
}
