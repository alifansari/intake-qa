#!/usr/bin/env node
/**
 * generate-seed.mjs — reproducible demo data for the Outcome Reconciliation
 * Dashboard.
 *
 * WHY: the dashboard consumes real output/*.score.json files, but for sales
 * demos we need ~200 calls with believable PI economics and a *known* ground
 * truth so the calibration/honesty panels have real content. This script
 * fabricates that data. It writes ONLY into web/data — it never touches the
 * CLI's real output/ folder.
 *
 * REPRODUCIBLE: a fixed MASTER_SEED drives a small deterministic PRNG
 * (mulberry32). Re-running produces byte-identical files. Change MASTER_SEED to
 * roll a fresh-but-still-deterministic dataset.
 *
 * OUTPUTS (all under web/data/):
 *   scored-calls/<call_id>.score.json   one file per call, matching the REAL
 *                                        score.json schema exactly
 *   call-meta.json                       sidecar: received_at, rep, source
 *                                        (deliberately NOT in score.json)
 *   outcomes.json                        the human-entered ground truth
 *
 * RUN:  node scripts/generate-seed.mjs      (from web/)
 *
 * ------------------------------------------------------------------ PARAMETERS
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MASTER_SEED = 20260702; // change this to roll a new deterministic dataset
const NUM_CALLS = 200; // ~200 scored calls
const NUM_REPS = 8; // 8 fake intake reps
const SPAN_DAYS = 90; // spread across ~90 days so trends render
const NOW = new Date("2026-07-01T17:00:00Z"); // fixed "today" for reproducibility

// Attorney FEE per case type (33% contingency, median-anchored — NOT gross
// settlement). Most cases modest; catastrophic outliers are rare on purpose.
const CASE_TYPES = [
  { type: "mva_standard", fee: 5000, weight: 34 },
  { type: "mva_commercial", fee: 10000, weight: 10 }, // trucking; averages run higher
  { type: "slip_and_fall", fee: 9000, weight: 14 },
  { type: "premises", fee: 8000, weight: 12 },
  { type: "dog_bite", fee: 19300, weight: 12 }, // III avg claim $58,545 (2023) x ~33%
  { type: "med_mal_referral", fee: 33000, weight: 8 }, // referral cut
  { type: "motorcycle", fee: 14000, weight: 10 },
];

const SOURCES = [
  "google_lsa",
  "google_ppc",
  "referral_attorney",
  "past_client",
  "billboard",
  "organic",
  "avvo",
];

const REP_NAMES = [
  "Danielle Cho",
  "Rob Alvarez",
  "Marisol Vega",
  "Tyler Brooks",
  "Priya Nair",
  "Andre Wallace",
  "Jenna Okafor",
  "Sam Ortiz",
];

// -------------------------------------------------------------- DETERMINISTIC RNG
// mulberry32: tiny, fast, seedable. Same seed -> same stream, forever.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(MASTER_SEED);

const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const jitter = (base, frac) => Math.round(base * (1 + (rand() * 2 - 1) * frac));

function weightedCaseType() {
  const total = CASE_TYPES.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of CASE_TYPES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CASE_TYPES[0];
}

// A realistic 0..100 overall-score spread (skewed toward the middle/low, as real
// intake QA tends to be), so the band chart has calls in every band.
function drawScore() {
  const roll = rand();
  if (roll < 0.22) return randInt(8, 39); // intervention
  if (roll < 0.5) return randInt(40, 59); // needs coaching
  if (roll < 0.8) return randInt(60, 79); // developing
  return randInt(80, 97); // strong
}

function bandName(score) {
  if (score < 40) return "intervention";
  if (score < 60) return "needs_coaching";
  if (score < 70) return "developing";
  if (score < 85) return "strong";
  return "exemplary";
}

function confidenceFor(score) {
  // Higher and lower extremes are easier to judge -> higher confidence.
  if (score < 25 || score >= 80) return chance(0.85) ? "high" : "medium";
  if (score < 45 || score >= 65) return chance(0.6) ? "medium" : "high";
  return chance(0.5) ? "medium" : "low";
}

// -------------------------------------------------------------- OUTCOME MODEL
// Ground-truth outcome generator. The KEY property: sign rate must rise with
// score band so the hero chart separates. Flagged calls (lost signable) get a
// callback-and-recovery sub-model with deliberate scorer mistakes mixed in.
function drawOutcome({ score, flagged, receivedAt, fee }) {
  // Base "was this actually signable & did they sign somewhere" probability,
  // strongly correlated with score band.
  let signableTruth;
  if (score >= 80) signableTruth = 0.9;
  else if (score >= 60) signableTruth = 0.62;
  else if (score >= 40) signableTruth = 0.32;
  else signableTruth = 0.12;

  // ~15% of everything is still unknown (populates the data-quality nag & queue).
  if (chance(0.15)) {
    return blankResolved("unknown", receivedAt);
  }

  if (flagged) {
    // A flagged call = engine said "signable but no retainer ask". Ground truth:
    //  - DELIBERATE false alarms: ~12% actually weren't signable.
    if (chance(0.12)) return blankResolved("not_signable_disqualified", receivedAt);

    // Did the firm actually call this flagged lead back?
    const calledBack = chance(0.55);
    if (!calledBack) {
      // No callback: signable leads sign with the first responder ~78% -> mostly walk.
      if (chance(0.78)) return blankResolved("signed_elsewhere", receivedAt, fee ? 0 : 0);
      if (chance(0.4)) return blankResolved("still_open", receivedAt);
      return chance(0.5)
        ? blankResolved("no_representation", receivedAt)
        : blankResolved("unreachable", receivedAt);
    }

    // Callback made: how fast? Fast callbacks recover; cold (>1h) rarely do.
    const ttcHours = drawCallbackHours();
    const cbTs = new Date(receivedAt.getTime() + ttcHours * 3600 * 1000).toISOString();
    const recoveryProb = ttcHours < 1 ? 0.55 : ttcHours < 4 ? 0.28 : ttcHours < 24 ? 0.12 : 0.04;
    if (chance(recoveryProb)) {
      return {
        outcome_code: "signed_us_after_callback",
        callback_made: true,
        callback_timestamp: cbTs,
        time_to_callback_hours: round1(ttcHours),
        who_called: pick(REP_NAMES),
        realized_fee_recovered: fee,
        outcome_entered_by: "demo-seed",
        outcome_entered_at: NOW.toISOString(),
        outcome_version: 1,
        edits: [],
      };
    }
    // Called back but too late / lost anyway.
    if (chance(0.5)) return withCallback("signed_elsewhere", receivedAt, ttcHours, cbTs);
    if (chance(0.5)) return withCallback("still_open", receivedAt, ttcHours, cbTs);
    return withCallback("no_representation", receivedAt, ttcHours, cbTs);
  }

  // NOT flagged. Mostly correct passes, but seed a few MISSED CATCHES
  // (unflagged calls that signed elsewhere) so honesty panel has false negatives.
  if (chance(signableTruth)) {
    // It signed somewhere. High-score calls mostly signed with us (first call);
    // some slip through unflagged and sign elsewhere -> missed catch.
    if (score >= 60 && chance(0.8)) return blankResolved("signed_us_first_call", receivedAt, fee);
    if (chance(0.35)) return blankResolved("signed_elsewhere", receivedAt); // missed catch
    return blankResolved("signed_us_first_call", receivedAt, fee);
  }
  // Didn't sign anywhere.
  if (chance(0.5)) return blankResolved("not_signable_disqualified", receivedAt);
  if (chance(0.5)) return blankResolved("no_representation", receivedAt);
  return blankResolved("still_open", receivedAt);
}

function drawCallbackHours() {
  const r = rand();
  if (r < 0.35) return rand() * 1; // < 1 hr (hot)
  if (r < 0.65) return 1 + rand() * 3; // 1–4 hrs
  if (r < 0.88) return 4 + rand() * 20; // 4–24 hrs
  return 24 + rand() * 96; // cold, 1–5 days
}

function blankResolved(code, receivedAt, fee = null) {
  return {
    outcome_code: code,
    callback_made: false,
    callback_timestamp: null,
    time_to_callback_hours: null,
    who_called: null,
    realized_fee_recovered: code.startsWith("signed_us") ? fee : null,
    outcome_entered_by: code === "unknown" ? "system" : "demo-seed",
    outcome_entered_at: code === "unknown" ? new Date(0).toISOString() : NOW.toISOString(),
    outcome_version: code === "unknown" ? 0 : 1,
    edits: [],
  };
}

function withCallback(code, receivedAt, ttcHours, cbTs) {
  return {
    outcome_code: code,
    callback_made: true,
    callback_timestamp: cbTs,
    time_to_callback_hours: round1(ttcHours),
    who_called: pick(REP_NAMES),
    realized_fee_recovered: null,
    outcome_entered_by: "demo-seed",
    outcome_entered_at: NOW.toISOString(),
    outcome_version: 1,
    edits: [],
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// ------------------------------------------------------- SCORE.JSON BUILDER
// Produces an object matching the real scoring-engine schema. We fill the
// fields the dashboard reads richly and keep the rest representative.
function buildScoredCall({ id, score, caseType, flagged, fee }) {
  const band = bandName(score);
  const confidence = confidenceFor(score);
  const signable = flagged || score >= 55;

  const catScore = (base) => Math.max(0, Math.min(100, jitter(base, 0.25)));
  const scaleAround = (target) => {
    // category scores that roughly average to `target`
    return {
      qualification: { score: catScore(target + randInt(-8, 12)) },
      conversion: { score: flagged ? catScore(target - 30) : catScore(target) },
      connection: { score: catScore(target + randInt(-10, 15)) },
      risk_compliance: { score: catScore(target + randInt(-5, 20)) },
      process: { score: catScore(target - randInt(0, 20)) },
    };
  };

  return {
    call_id: id,
    transcript_quality: { scoreable: true, issues: [] },
    call_type: "new_pi_inquiry",
    language: "en",
    scored: "full",
    duration_assessed_sec: randInt(70, 480),
    classification_confidence: "high",
    critical_fails: [],
    review_recommended: [],
    case_signability: signable
      ? score >= 70
        ? "likely_signable"
        : "possibly_signable"
      : "not_signable",
    signability_basis: signable
      ? "Meets firm criteria: identifiable at-fault party, treated injury, and coverage indicated."
      : "Did not meet firm intake criteria on liability, injury, or coverage.",
    high_value_indicators: [],
    escalation_handled: "not_applicable",
    conversion: {
      retainer_asked: !flagged && score >= 70,
      retainer_outcome: flagged ? "no_ask" : score >= 70 ? "sent" : "no_ask",
      next_step_specificity: flagged ? "vague" : score >= 70 ? "specific" : "vague",
      contact_info_captured: score >= 60 ? "complete" : "partial",
    },
    alerts: {
      lost_signable_case: flagged,
      missed_development_opportunity: !flagged && signable && score < 60,
      after_hours_leak: !flagged && chance(0.05),
      revenue_at_risk: flagged
        ? {
            amount_usd: fee,
            case_type_matched: caseType,
            basis: "firm_average_fee_for_case_type",
            evidence_quotes: [
              "The other driver admitted fault and I have the police report number.",
              "They gave me their insurance information at the scene.",
            ],
          }
        : { amount_usd: null, case_type_matched: null, basis: null, evidence_quotes: [] },
    },
    scores: {
      overall: score,
      band,
      confidence,
      categories: scaleAround(score),
    },
    coaching: {
      top_strength: {
        behavior: "Opened with genuine, non-scripted empathy tied to the caller's situation.",
        quote: "I'm so sorry that happened — are you okay right now?",
        timestamp: "00:12",
      },
      one_thing: flagged
        ? {
            behavior: "Make the retainer ask before ending the call — every sign criterion was met.",
            missed_moment_timestamp: "01:14",
            model_utterance:
              "This is exactly the kind of case we handle. I can text you our agreement right now — you sign on your phone in about a minute — and from then on the insurer deals with us, not you.",
            why_it_matters:
              "A warm, signable lead cools fast; the next firm they call gets this case and the fee walks.",
          }
        : {
            behavior: "Tighten the next-step commitment so the caller knows exactly what happens next.",
            missed_moment_timestamp: "01:20",
            model_utterance:
              "I'm scheduling your attorney call for tomorrow at 10am — you'll get a text confirmation in two minutes.",
            why_it_matters: "A specific, owned next step keeps a qualified caller from shopping around.",
          },
    },
    summary: flagged
      ? "A signable intake that ended without a retainer ask — liability, injury, and coverage were all present. Estimated fee at risk to the first-responding competitor."
      : "An intake handled with " +
        (score >= 70 ? "a clear close and specific next step." : "gaps in qualification and next-step commitment."),
  };
}

// ------------------------------------------------------------------- MAIN
async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(here, "..", "data");
  const callsDir = path.join(dataDir, "scored-calls");

  // Fresh start each run so removed calls don't linger.
  await fs.rm(callsDir, { recursive: true, force: true });
  await fs.mkdir(callsDir, { recursive: true });

  const metas = [];
  const outcomes = [];

  for (let i = 0; i < NUM_CALLS; i++) {
    const n = String(i + 1).padStart(4, "0");
    const id = `call-${n}`;
    const score = drawScore();
    const ct = weightedCaseType();
    const fee = jitter(ct.fee, 0.35);

    // Flagging concentrates on mid/high signable calls that dropped the close.
    const flagChance = score >= 70 ? 0.32 : score >= 50 ? 0.5 : score >= 40 ? 0.35 : 0.08;
    const flagged = chance(flagChance);

    const daysAgo = randInt(0, SPAN_DAYS);
    const receivedAt = new Date(
      NOW.getTime() - daysAgo * 86400_000 - randInt(0, 86400) * 1000,
    );

    const scored = buildScoredCall({ id, score, caseType: ct.type, flagged, fee });
    await fs.writeFile(
      path.join(callsDir, `${id}.score.json`),
      JSON.stringify(scored, null, 2) + "\n",
    );

    metas.push({
      call_id: id,
      received_at: receivedAt.toISOString(),
      rep: REP_NAMES[i % NUM_REPS],
      source: pick(SOURCES),
    });

    const outcome = drawOutcome({ score, flagged, receivedAt, fee });
    outcomes.push({ call_id: id, ...outcome });
  }

  await fs.writeFile(
    path.join(dataDir, "call-meta.json"),
    JSON.stringify(metas, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(dataDir, "outcomes.json"),
    JSON.stringify(outcomes, null, 2) + "\n",
  );

  // Console summary so `node scripts/generate-seed.mjs` is self-verifying.
  const counts = outcomes.reduce((m, o) => ((m[o.outcome_code] = (m[o.outcome_code] || 0) + 1), m), {});
  console.log(`Seed written with MASTER_SEED=${MASTER_SEED}`);
  console.log(`  scored-calls: ${NUM_CALLS} files in data/scored-calls/`);
  console.log(`  call-meta.json, outcomes.json written`);
  console.log(`  outcome distribution:`, counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
