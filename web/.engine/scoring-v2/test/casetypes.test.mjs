// Unit tests: case-type routing overlay. Pure code, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CASE_TYPE_ROUTING, caseTypeRouting } from "../lib/casetypes.mjs";

const LISTED = [
  "mva_standard",
  "mva_commercial",
  "motorcycle",
  "pedestrian_bicycle",
  "rideshare",
  "premises",
  "dog_bite",
  "product",
  "med_mal",
  "wrongful_death",
  "government_entity",
  "workers_comp",
  "elder_abuse",
  "other_pi",
  "non_case",
];

// ---------- shape & coverage ------------------------------------------------

test("every listed case type returns a well-shaped row", () => {
  for (const ct of LISTED) {
    const row = caseTypeRouting(ct);
    assert.equal(typeof row.refer_default, "boolean", `${ct}.refer_default`);
    assert.equal(typeof row.urgency, "boolean", `${ct}.urgency`);
    assert.equal(typeof row.coverage_floor_source, "string", `${ct}.coverage_floor_source`);
    assert.equal(typeof row.spoliation, "boolean", `${ct}.spoliation`);
    assert.equal(typeof row.notes, "string", `${ct}.notes`);
    assert.ok(row.coverage_floor_source.length > 0, `${ct} floor source non-empty`);
  }
});

test("trucking is covered as its own row (=mva_commercial truck)", () => {
  assert.ok(CASE_TYPE_ROUTING.trucking, "trucking row present");
});

// ---------- refer-out defaults ----------------------------------------------

test("med_mal, product, elder_abuse, workers_comp default to refer_out", () => {
  for (const ct of ["med_mal", "product", "elder_abuse", "workers_comp"]) {
    assert.equal(caseTypeRouting(ct).refer_default, true, `${ct} refer_default`);
  }
});

test("standard auto family does NOT default to refer_out", () => {
  for (const ct of ["mva_standard", "motorcycle", "pedestrian_bicycle", "other_pi"]) {
    assert.equal(caseTypeRouting(ct).refer_default, false, `${ct} refer_default`);
  }
});

// ---------- urgency ---------------------------------------------------------

test("government_entity and the trucking family carry urgency", () => {
  assert.equal(caseTypeRouting("government_entity").urgency, true);
  assert.equal(caseTypeRouting("mva_commercial").urgency, true);
  assert.equal(caseTypeRouting("trucking").urgency, true);
});

test("standard auto does not carry urgency", () => {
  assert.equal(caseTypeRouting("mva_standard").urgency, false);
});

// ---------- spoliation ------------------------------------------------------

test("trucking family flags spoliation (ELD/dashcam overwrite)", () => {
  assert.equal(caseTypeRouting("trucking").spoliation, true);
  assert.equal(caseTypeRouting("mva_commercial").spoliation, true);
});

test("non-commercial types do not flag spoliation", () => {
  for (const ct of ["mva_standard", "med_mal", "premises", "dog_bite"]) {
    assert.equal(caseTypeRouting(ct).spoliation, false, `${ct} spoliation`);
  }
});

// ---------- coverage-floor sources ------------------------------------------

test("coverage_floor_source is sourced from the right table per case type", () => {
  assert.equal(caseTypeRouting("med_mal").coverage_floor_source, "medmal");
  assert.equal(caseTypeRouting("product").coverage_floor_source, "product");
  assert.equal(caseTypeRouting("government_entity").coverage_floor_source, "government");
  assert.equal(caseTypeRouting("mva_commercial").coverage_floor_source, "fmcsa");
  assert.equal(caseTypeRouting("trucking").coverage_floor_source, "fmcsa");
  assert.equal(caseTypeRouting("rideshare").coverage_floor_source, "rideshare");
  assert.equal(caseTypeRouting("dog_bite").coverage_floor_source, "homeowner");
  assert.equal(caseTypeRouting("premises").coverage_floor_source, "premises");
});

// ---------- unknown / absent -> safe neutral default ------------------------

test("unknown type returns the safe neutral default", () => {
  const def = caseTypeRouting("space_law");
  assert.deepEqual(def, {
    refer_default: false,
    urgency: false,
    coverage_floor_source: "standard_auto",
    spoliation: false,
    notes: "",
  });
});

test("absent (undefined/null/empty) type returns the safe neutral default", () => {
  for (const ct of [undefined, null, ""]) {
    assert.deepEqual(caseTypeRouting(ct), {
      refer_default: false,
      urgency: false,
      coverage_floor_source: "standard_auto",
      spoliation: false,
      notes: "",
    });
  }
});

test("the unknown default is a fresh object each call (never a shared mutable)", () => {
  const a = caseTypeRouting("unknown_x");
  const b = caseTypeRouting("unknown_x");
  assert.notEqual(a, b, "distinct instances");
  a.refer_default = true;
  assert.equal(caseTypeRouting("unknown_x").refer_default, false, "no shared mutation");
});

// ---------- immutability ----------------------------------------------------

test("CASE_TYPE_ROUTING is frozen", () => {
  assert.equal(Object.isFrozen(CASE_TYPE_ROUTING), true);
  assert.throws(() => {
    CASE_TYPE_ROUTING.mva_standard = { hacked: true };
  }, TypeError);
});

test("each routing row is frozen", () => {
  for (const ct of LISTED) {
    assert.equal(Object.isFrozen(CASE_TYPE_ROUTING[ct]), true, `${ct} row frozen`);
  }
});
