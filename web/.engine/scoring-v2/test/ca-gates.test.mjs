// scoring-v2/test/ca-gates.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  caDramShopGate,
  caWorkersCompGate,
  caElderAbuseGate,
  caNoInjuryGate,
  caSolExpiredGate,
  evaluateCaGates,
} from "../lib/ca-gates.mjs";

test("dram shop: furnishing to an adult is barred (decline override + citation)", () => {
  const r = caDramShopGate({ case_type: "dram_shop" });
  assert.equal(r.fired, true);
  assert.equal(r.override_disposition, "decline_with_grace");
  assert.match(r.citation, /25602/);
});

test("dram shop: obviously intoxicated minor by a licensee is the exception (review, not barred)", () => {
  const r = caDramShopGate({
    case_type: "dram_shop",
    dram_shop_licensed_vendor: true,
    dram_shop_obviously_intoxicated_minor: true,
  });
  assert.equal(r.fired, false);
  assert.equal(r.review, true);
  assert.match(r.citation, /25602\.1/);
});

test("dram shop gate ignores non-dram-shop case types", () => {
  assert.equal(caDramShopGate({ case_type: "mva_standard" }).fired, false);
});

test("workers comp: no third party is comp-only -> refer override", () => {
  const r = caWorkersCompGate({ case_type: "work_injury", work_injury_third_party: false });
  assert.equal(r.fired, true);
  assert.equal(r.override_disposition, "refer_out");
  assert.match(r.citation, /3602/);
});

test("workers comp: a third party opens a live civil case (not fired, lien flagged)", () => {
  const r = caWorkersCompGate({ case_type: "work_injury", work_injury_third_party: true });
  assert.equal(r.fired, false);
  assert.ok(r.flags.includes("ca_wc_lien_applies"));
});

test("workers comp: unknown third-party status routes to review", () => {
  const r = caWorkersCompGate({ case_type: "work_injury" });
  assert.equal(r.fired, false);
  assert.equal(r.review, true);
  assert.ok(r.flags.includes("attorney_review_required"));
});

test("elder abuse: reckless neglect unlocks the heightened-remedy value track", () => {
  const r = caElderAbuseGate({ case_type: "nursing_home", elder_abuse_reckless_neglect: true });
  assert.equal(r.value_hint, "high");
  assert.match(r.citation, /15657|Delaney/);
});

test("elder abuse: ordinary professional negligence stays MICRA-capped", () => {
  const r = caElderAbuseGate({ case_type: "nursing_home", elder_abuse_reckless_neglect: false });
  assert.equal(r.value_hint, "standard");
  assert.match(r.citation, /3333\.2/);
});

test("no bodily injury is not a PI file (decline override)", () => {
  assert.equal(caNoInjuryGate({ injury: "none" }).fired, true);
  assert.equal(caNoInjuryGate({ property_damage_only: true }).fired, true);
  assert.equal(caNoInjuryGate({ injury: "soft_tissue" }).fired, false);
});

test("SOL expired fires a decline; minor tolling suppresses it to review", () => {
  assert.equal(caSolExpiredGate({ urgency: "expired" }).fired, true);
  const tolled = caSolExpiredGate({ urgency: "expired", minorTollingMayApply: true });
  assert.equal(tolled.fired, false);
  assert.equal(tolled.review, true);
});

test("evaluateCaGates picks the most severe override", () => {
  // A dram-shop work injury with no injury: multiple gates, decline wins.
  const agg = evaluateCaGates(
    { case_type: "dram_shop", injury: "none" },
    { urgency: "ok" }
  );
  assert.equal(agg.override_disposition, "decline_with_grace");
  assert.ok(agg.controlling);
});

test("evaluateCaGates on a clean case fires nothing", () => {
  const agg = evaluateCaGates(
    { case_type: "mva_standard", injury: "hard" },
    { urgency: "ok" }
  );
  assert.equal(agg.override_disposition, null);
  assert.equal(agg.fired.length, 0);
});
