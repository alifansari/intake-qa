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

test("output always carries the SOL disclaimer and a flip fact path", () => {
  const r = triageFromFacts(
    { case_type: "mva_standard", incident_date: recent, liability: "unclear", injury: "moderate", coverage: "unknown" },
    {},
    { now: NOW, computeSol }
  );
  assert.match(r.sol.disclaimer, /not legal advice/i);
  assert.ok(Array.isArray(r.next_questions));
});
