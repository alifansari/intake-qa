// scoring-v2/test/triage-live.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { triageFromFacts } from "../triage-live.mjs";
import { computeSol } from "../../web/analysis/sol.mjs";

const NOW = new Date("2026-07-13T12:00:00Z");
const recent = "2025-09-01"; // well within SOL as of NOW

test("strong clean auto file grades A / sign", () => {
  const r = triageFromFacts(
    {
      case_type: "mva_standard",
      incident_date: recent,
      liability: "clear",
      injury: "hard",
      objective_findings: true,
      coverage: "high",
    },
    { posture: "selective" },
    { now: NOW, computeSol }
  );
  assert.equal(r.disposition, "sign_now");
  assert.equal(r.grade.letter, "A");
  assert.equal(r.grade.color, "green");
  assert.equal(r.compliance.recommendation_only, true);
});

test("dram shop against a bar is overridden to decline with the statute cited", () => {
  const r = triageFromFacts(
    { case_type: "dram_shop", incident_date: recent, liability: "clear", injury: "hard", coverage: "high" },
    {},
    { now: NOW, computeSol }
  );
  assert.equal(r.disposition, "decline_with_grace");
  assert.equal(r.grade.letter, "D");
  assert.ok(r.ca_gates.fired.some((g) => /25602/.test(g.citation)));
  assert.match(r.driving_reason, /immuniz|furnish/i);
});

test("work injury with no third party is referred to a comp specialist", () => {
  const r = triageFromFacts(
    {
      case_type: "work_injury",
      incident_date: recent,
      liability: "clear",
      injury: "hard",
      objective_findings: true,
      coverage: "moderate",
      work_injury_third_party: false,
    },
    {},
    { now: NOW, computeSol }
  );
  assert.equal(r.disposition, "refer_out");
  assert.ok(r.ca_gates.fired.some((g) => g.name === "workers_comp_only"));
});

test("expired statute of limitations is overridden to decline", () => {
  const r = triageFromFacts(
    {
      case_type: "mva_standard",
      incident_date: "2020-01-01", // > 2 years before NOW
      liability: "clear",
      injury: "hard",
      objective_findings: true,
      coverage: "high",
    },
    {},
    { now: NOW, computeSol }
  );
  assert.equal(r.sol.urgency, "expired");
  assert.equal(r.disposition, "decline_with_grace");
  assert.ok(r.ca_gates.fired.some((g) => g.name === "sol_expired"));
});

test("out-of-scope case type refers out rather than declines", () => {
  const r = triageFromFacts(
    { case_type: "med_mal", incident_date: recent, liability: "clear", injury: "catastrophic", objective_findings: true, coverage: "high" },
    { posture: "selective", accepted_case_types: ["mva_standard", "premises"] },
    { now: NOW, computeSol }
  );
  assert.equal(r.disposition, "refer_out");
  assert.equal(r.grade.color, "amber");
});

test("no bodily injury is declined as not a PI file", () => {
  const r = triageFromFacts(
    { case_type: "mva_standard", incident_date: recent, liability: "clear", injury: "none", coverage: "high" },
    {},
    { now: NOW, computeSol }
  );
  assert.equal(r.disposition, "decline_with_grace");
  assert.ok(r.ca_gates.fired.some((g) => g.name === "no_bodily_injury"));
});

test("nursing home with reckless neglect grades as a high-value sign/develop, not a decline", () => {
  const r = triageFromFacts(
    {
      case_type: "nursing_home",
      incident_date: recent,
      liability: "clear",
      injury: "catastrophic",
      objective_findings: true,
      coverage: "high",
      elder_abuse_reckless_neglect: true,
      accepted_case_types: ["nursing_home", "elder_abuse", "mva_standard"],
    },
    { posture: "selective", accepted_case_types: ["nursing_home", "elder_abuse", "mva_standard"] },
    { now: NOW, computeSol }
  );
  assert.notEqual(r.disposition, "decline_with_grace");
  assert.equal(r.value_tier, "high");
  assert.ok(r.ca_gates.flags.includes("ca_elder_abuse_heightened"));
});

test("thin soft-tissue with minimal limits is not a confident sign", () => {
  const r = triageFromFacts(
    {
      case_type: "mva_standard",
      incident_date: recent,
      liability: "disputed",
      injury: "soft_tissue",
      objective_findings: false,
      coverage: "minimal",
      treatment_gap: true,
    },
    { posture: "selective" },
    { now: NOW, computeSol }
  );
  assert.notEqual(r.grade.letter, "A");
  assert.ok(["develop", "decline_with_grace", "refer_out"].includes(r.disposition));
  assert.ok(r.flip_fact);
});

test("Prop 213: uninsured owner/operator with no objective anchors is not signable, but an insured caller (and an excepted passenger) is not barred", () => {
  const facts = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "clear",
    injury: "soft_tissue",
    objective_findings: false, // Prop 213 profile requires NO objective anchors
    coverage: "moderate",
  };
  const insured = triageFromFacts({ ...facts, client_insured_status: "insured" }, { posture: "selective" }, { now: NOW, computeSol });
  const barred = triageFromFacts({ ...facts, client_insured_status: "uninsured_owner_operator" }, { posture: "selective" }, { now: NOW, computeSol });
  const passenger = triageFromFacts({ ...facts, client_insured_status: "passenger" }, { posture: "selective" }, { now: NOW, computeSol });

  // The bar collapses the economic-only file; an insured caller keeps it alive.
  assert.equal(barred.disposition, "decline_with_grace");
  assert.notEqual(insured.disposition, "decline_with_grace");
  // Passengers are excepted from §3333.4 — same outcome as insured.
  assert.equal(passenger.disposition, insured.disposition);
  // A surgical/objective-anchor file is NEVER barred, even uninsured.
  const withImaging = triageFromFacts(
    { ...facts, objective_findings: true, injury: "hard", client_insured_status: "uninsured_owner_operator" },
    { posture: "selective" },
    { now: NOW, computeSol }
  );
  assert.notEqual(withImaging.disposition, "decline_with_grace");
});

test("firm minimum-limits floor refers out a signable file below the floor, unless UM/UIM backstops it", () => {
  const signable = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "clear",
    injury: "hard",
    objective_findings: true,
    coverage: "moderate", // ~$50-100k band, below a $100k floor
  };
  const noFloor = triageFromFacts(signable, { posture: "selective" }, { now: NOW, computeSol });
  const floor100 = triageFromFacts(signable, { posture: "selective", min_policy_limits: "100k" }, { now: NOW, computeSol });
  const floor100um = triageFromFacts({ ...signable, client_has_um: true }, { posture: "selective", min_policy_limits: "100k" }, { now: NOW, computeSol });
  const floor50 = triageFromFacts(signable, { posture: "selective", min_policy_limits: "50k" }, { now: NOW, computeSol });
  const floorUnknownCov = triageFromFacts({ ...signable, coverage: "unknown" }, { posture: "selective", min_policy_limits: "100k" }, { now: NOW, computeSol });

  assert.equal(noFloor.disposition, "sign_now");
  assert.equal(floor100.disposition, "refer_out"); // appetite floor caps to refer, never decline
  assert.match(floor100.driving_reason, /minimum-limits appetite/i);
  assert.equal(floor100um.disposition, "sign_now"); // UM/UIM backstop -> floor does not fire
  assert.equal(floor50.disposition, "sign_now"); // moderate band meets a $50k floor
  assert.notEqual(floorUnknownCov.disposition, "refer_out"); // unknown coverage never fires the floor
  // The floor is appetite, not a statutory bar: it can never push past refer_out to decline.
  assert.notEqual(floor100.disposition, "decline_with_grace");
});

test("liability corroboration: a police report or witnesses lift a merely disputed fault read", () => {
  const base = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "disputed",
    injury: "hard",
    objective_findings: true,
    coverage: "high",
  };
  const bare = triageFromFacts(base, { posture: "selective" }, { now: NOW, computeSol });
  const withReport = triageFromFacts({ ...base, police_report_favorable: true }, { posture: "selective" }, { now: NOW, computeSol });
  const withWitnesses = triageFromFacts({ ...base, independent_witnesses: true }, { posture: "selective" }, { now: NOW, computeSol });
  // Corroboration should never make a file worse, and should push a good-injury
  // disputed file toward signing.
  assert.equal(withReport.disposition, "sign_now");
  assert.equal(withWitnesses.disposition, "sign_now");
  assert.notEqual(bare.disposition, "sign_now");
});

test("ambulance/ER transport corroborates a moderate injury with no imaging", () => {
  const base = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "clear",
    injury: "moderate",
    objective_findings: false,
    coverage: "high",
  };
  const noTransport = triageFromFacts(base, { posture: "selective" }, { now: NOW, computeSol });
  const transport = triageFromFacts({ ...base, ambulance_transport: true }, { posture: "selective" }, { now: NOW, computeSol });
  // Transport lifts the damages read, so the transported file is at least as
  // strong and no worse.
  assert.equal(transport.disposition, "sign_now");
  assert.notEqual(noTransport.disposition, "sign_now");
});

test("property damage is bidirectional: significant damage defeats the minor-impact (MIST) penalty", () => {
  // A firm that does NOT take MIST: a minor-impact soft-tissue file is penalized.
  // Heavy property damage cannot coexist with minor impact, so it lifts that
  // penalty and the file reads strictly better than the MIST-only version.
  const softMist = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "clear",
    injury: "soft_tissue",
    objective_findings: false,
    coverage: "high",
    minimal_impact: true,
  };
  const mistOnly = triageFromFacts(softMist, { posture: "selective", take_mist: false }, { now: NOW, computeSol });
  const withHeavyPd = triageFromFacts({ ...softMist, significant_property_damage: true }, { posture: "selective", take_mist: false }, { now: NOW, computeSol });
  const rank = { sign_now: 3, develop: 2, refer_out: 1, decline_with_grace: 0 };
  assert.equal(mistOnly.disposition, "decline_with_grace"); // MIST penalty applied
  assert.ok(rank[withHeavyPd.disposition] > rank[mistOnly.disposition]); // penalty lifted
});

test("habitability / mold is a first-class case type the firm can accept or refer out", () => {
  const facts = { case_type: "habitability", incident_date: recent, liability: "clear", injury: "moderate", objective_findings: true, coverage: "moderate" };
  const accepted = triageFromFacts(facts, { posture: "selective", accepted_case_types: ["habitability", "mva_standard"] }, { now: NOW, computeSol });
  const notAccepted = triageFromFacts(facts, { posture: "selective", accepted_case_types: ["mva_standard"] }, { now: NOW, computeSol });
  assert.equal(accepted.case_type, "habitability");
  assert.notEqual(accepted.disposition, "refer_out"); // taken -> scored on merits
  assert.equal(notAccepted.disposition, "refer_out"); // not taken -> refer out
});

test("red-flag strictness only adds review caution, never caps a disposition", () => {
  const facts = {
    case_type: "mva_standard",
    incident_date: recent,
    liability: "clear",
    injury: "hard",
    objective_findings: true,
    coverage: "high",
    red_flags: { multiple_prior_attorneys: true }, // a single behavior marker
  };
  const balanced = triageFromFacts(facts, { posture: "selective", red_flag_strictness: "balanced" }, { now: NOW, computeSol });
  const strict = triageFromFacts(facts, { posture: "selective", red_flag_strictness: "strict" }, { now: NOW, computeSol });
  // One marker: balanced leaves the calibrated floor (G3 needs >=2); strict
  // flags review at the first marker.
  assert.equal(balanced.attorney_review_required, false);
  assert.equal(strict.attorney_review_required, true);
  // Neither caps the disposition — a strong file still signs even under strict.
  assert.equal(balanced.disposition, "sign_now");
  assert.equal(strict.disposition, "sign_now");
});

test("decline-vs-refer appetite: a firm can decline out-of-appetite types instead of referring them, but statutory refers still refer", () => {
  const dog = { case_type: "dog_bite", incident_date: recent, liability: "clear", injury: "moderate", objective_findings: true, coverage: "moderate" };
  const accepted = ["mva_standard", "premises"]; // dog_bite NOT accepted

  const refers = triageFromFacts(dog, { posture: "selective", accepted_case_types: accepted }, { now: NOW, computeSol });
  const declines = triageFromFacts(dog, { posture: "selective", accepted_case_types: accepted, decline_out_of_appetite: true }, { now: NOW, computeSol });
  assert.equal(refers.disposition, "refer_out"); // default: refer the out-of-appetite type
  assert.equal(declines.disposition, "decline_with_grace"); // firm chose to decline
  assert.match(declines.driving_reason, /does not take/i);

  // A STATUTORY refer (workers-comp comp-only) must stay a refer even when the
  // firm declines out-of-appetite types and does not accept work_injury.
  const wc = triageFromFacts(
    { case_type: "work_injury", incident_date: recent, liability: "clear", injury: "hard", objective_findings: true, coverage: "moderate", work_injury_third_party: false },
    { posture: "selective", accepted_case_types: ["mva_standard"], decline_out_of_appetite: true },
    { now: NOW, computeSol }
  );
  assert.equal(wc.disposition, "refer_out");
});

test("output always carries the SOL disclaimer and a flip fact path", () => {
  const r = triageFromFacts(
    { case_type: "mva_standard", incident_date: recent, liability: "unclear", injury: "moderate", coverage: "unknown" },
    {},
    { now: NOW, computeSol }
  );
  assert.match(r.sol.disclaimer, /not legal advice/i);
  assert.ok(Array.isArray(r.next_questions));
});
