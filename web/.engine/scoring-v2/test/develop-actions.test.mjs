// Unit tests: the DEVELOP action conveyor. Pure code, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEVELOP_ACTIONS, rankDevelopActions } from "../lib/develop-actions.mjs";

// observed_on_call fact envelope (mirrors the engine's fact shape).
const observed = (value) => ({
  value,
  evidence: { quote: "stated on call", timestamp: "00:00", speaker: "caller" },
  observability: "observed_on_call",
  confidence: "high",
});
const inferred = (value) => ({ ...observed(value), observability: "inferred" });

// ---------- safety / empties -----------------------------------------------

test("empty input → []", () => {
  assert.deepEqual(rankDevelopActions({}), []);
  assert.deepEqual(rankDevelopActions(), []);
  assert.deepEqual(
    rankDevelopActions({ facts: {}, unknownDims: [], gateFlags: [] }),
    []
  );
});

test("junk / non-array inputs are tolerated → []", () => {
  assert.deepEqual(
    rankDevelopActions({ facts: null, unknownDims: null, gateFlags: undefined }),
    []
  );
});

// ---------- commercial truck: spoliation ranked FIRST (critical) -----------

test("commercial_truck fact present → spoliation action ranked FIRST (critical)", () => {
  const ranked = rankDevelopActions({
    facts: { commercial_truck: observed({ present: true }) },
    // add lower-priority triggers to prove critical jumps the queue
    unknownDims: ["coverage_path", "collectability_deep_pocket"],
  });
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].action_id, "truck_spoliation_letter");
  assert.equal(ranked[0].latency_criticality, "critical");
  assert.equal(ranked[0].obtainability, "pre_suit");
});

test("commercial_truck merely inferred → no spoliation action (observed-only)", () => {
  const ranked = rankDevelopActions({
    facts: { commercial_truck: inferred({ present: true }) },
  });
  assert.equal(
    ranked.find((r) => r.action_id === "truck_spoliation_letter"),
    undefined
  );
});

// ---------- coverage_path unknown surfaces both coverage actions -----------

test("coverage_path unknown → dec-page + limits-demand actions both surfaced", () => {
  const ranked = rankDevelopActions({ unknownDims: ["coverage_path"] });
  const ids = ranked.map((r) => r.action_id);
  assert.ok(ids.includes("client_dec_page"), "client dec page surfaced");
  assert.ok(ids.includes("defendant_limits_demand"), "limits demand surfaced");
});

// ---------- ranking: critical before routine -------------------------------

test("ranking puts critical latency before routine", () => {
  const ranked = rankDevelopActions({
    facts: { public_entity_defendant: observed({ present: true }) }, // critical
    unknownDims: ["liability_comparative_fault"], // routine (CHP report)
  });
  assert.ok(ranked.length >= 2);
  assert.equal(ranked[0].latency_criticality, "critical");
  // no routine row may precede a critical row
  const firstRoutine = ranked.findIndex((r) => r.latency_criticality === "routine");
  const lastCritical = ranked.map((r) => r.latency_criticality).lastIndexOf("critical");
  assert.ok(lastCritical < firstRoutine);
});

test("obtainability tiebreak: client_immediate / pre_suit precede discovery_only", () => {
  const ranked = rankDevelopActions({ unknownDims: ["coverage_path"] });
  // both coverage actions are routine; client_immediate dec page should lead pre_suit demand
  const idxDec = ranked.findIndex((r) => r.action_id === "client_dec_page");
  const idxDemand = ranked.findIndex((r) => r.action_id === "defendant_limits_demand");
  assert.ok(idxDec < idxDemand);
});

// ---------- individual trigger coverage ------------------------------------

test("underwater_profile gate flag → lien-existence intake (time_critical)", () => {
  const ranked = rankDevelopActions({ gateFlags: ["underwater_profile"] });
  const row = ranked.find((r) => r.action_id === "lien_existence_intake");
  assert.ok(row);
  assert.equal(row.latency_criticality, "time_critical");
});

test("perishable_evidence + liability unknown → scene-preservation with ethics tags", () => {
  const ranked = rankDevelopActions({
    unknownDims: ["liability_comparative_fault"],
    gateFlags: ["perishable_evidence"],
  });
  const row = ranked.find((r) => r.action_id === "preserve_scene_evidence");
  assert.ok(row);
  assert.ok(row.ethics_tags.includes("recorded_statement_all_party_consent"));
  assert.ok(row.ethics_tags.includes("no_solicitation_of_prospect"));
});

test("med_mal + sol_adjacent → CCP 364 notice; non-med_mal does not trigger it", () => {
  const hit = rankDevelopActions({
    facts: { case_type_primary: { value: "med_mal" } },
    gateFlags: ["sol_adjacent"],
  });
  assert.ok(hit.find((r) => r.action_id === "micra_364_notice"));
  const miss = rankDevelopActions({
    facts: { case_type_primary: { value: "mva_standard" } },
    gateFlags: ["sol_adjacent"],
  });
  assert.equal(miss.find((r) => r.action_id === "micra_364_notice"), undefined);
});

test("current counsel retained → termination action carries no_contact_if_represented", () => {
  const ranked = rankDevelopActions({
    facts: { retained_or_prior_attorney: observed({ current: true }) },
  });
  const row = ranked.find((r) => r.action_id === "prior_counsel_termination");
  assert.ok(row);
  assert.ok(row.ethics_tags.includes("no_contact_if_represented"));
});

test("ERISA lien source surfaces SPD request", () => {
  const ranked = rankDevelopActions({
    facts: {
      lien_sources: observed({ sources: ["erisa_selffunded"], erisa_funding_status: "unknown" }),
    },
  });
  assert.ok(ranked.find((r) => r.action_id === "erisa_spd_request"));
});

// ---------- compliance rails -----------------------------------------------

test('no "ISO ClaimSearch" pull action appears in the module source', () => {
  const src = readFileSync(
    fileURLToPath(new URL("../lib/develop-actions.mjs", import.meta.url)),
    "utf8"
  );
  // ISO ClaimSearch may be mentioned only to explicitly FORBID it. Assert no
  // action_id references it, and any label mention is negated ("do NOT ...").
  for (const row of DEVELOP_ACTIONS) {
    assert.ok(!/iso\s*claimsearch/i.test(row.action_id));
    if (/iso\s*claimsearch/i.test(row.label)) {
      assert.match(
        row.label,
        /do not (run|pull)[^.]*iso\s*claimsearch/i,
        `row ${row.action_id} may only mention ISO ClaimSearch to forbid it`
      );
    }
  }
  // sanity: the deliberate prohibition note is present somewhere in the source
  assert.match(src, /do not (run|pull)[^.]*iso\s*claimsearch/i);
});

test("no row emits a dollar figure or a computed calendar date", () => {
  const dollar = /\$\s?\d/;
  const isoDate = /\b\d{4}-\d{2}-\d{2}\b/;
  for (const row of DEVELOP_ACTIONS) {
    const blob = `${row.trigger} ${row.label} ${row.resolves}`;
    assert.ok(!dollar.test(blob), `row ${row.action_id} emits a dollar`);
    assert.ok(!isoDate.test(blob), `row ${row.action_id} emits a computed date`);
  }
});

// ---------- structure / immutability ---------------------------------------

test("DEVELOP_ACTIONS is frozen (and rows are frozen)", () => {
  assert.ok(Object.isFrozen(DEVELOP_ACTIONS));
  for (const row of DEVELOP_ACTIONS) {
    assert.ok(Object.isFrozen(row));
    assert.ok(Object.isFrozen(row.ethics_tags));
  }
  assert.throws(() => {
    DEVELOP_ACTIONS.push({});
  });
});

test("every row has the full shape and valid enum values", () => {
  const OBTAIN = ["client_immediate", "pre_suit", "discovery_only"];
  const LATENCY = ["routine", "time_critical", "critical"];
  const ETHICS = [
    "recorded_statement_all_party_consent",
    "no_contact_if_represented",
    "no_solicitation_of_prospect",
  ];
  const ids = new Set();
  for (const row of DEVELOP_ACTIONS) {
    assert.equal(typeof row.trigger, "string");
    assert.equal(typeof row.action_id, "string");
    assert.equal(typeof row.label, "string");
    assert.equal(typeof row.resolves, "string");
    assert.ok(OBTAIN.includes(row.obtainability), `${row.action_id} obtainability`);
    assert.ok(LATENCY.includes(row.latency_criticality), `${row.action_id} latency`);
    assert.ok(Array.isArray(row.ethics_tags));
    row.ethics_tags.forEach((t) => assert.ok(ETHICS.includes(t), `${row.action_id} ethics tag`));
    assert.ok(!ids.has(row.action_id), `duplicate action_id ${row.action_id}`);
    ids.add(row.action_id);
  }
});

test("every surfaced action is one of the canonical rows (no fabrication)", () => {
  const all = new Set(DEVELOP_ACTIONS.map((r) => r.action_id));
  const ranked = rankDevelopActions({
    facts: {
      commercial_truck: observed({ present: true }),
      public_entity_defendant: observed({ present: true }),
    },
    unknownDims: ["coverage_path", "collectability_deep_pocket", "damages_credibility"],
    gateFlags: ["underwater_profile", "perishable_evidence", "sol_adjacent"],
  });
  ranked.forEach((r) => assert.ok(all.has(r.action_id)));
});
