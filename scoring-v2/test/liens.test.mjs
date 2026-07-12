// Unit tests: net-recovery / lien-compression model. Pure, zero network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIEN_REDUCIBILITY, projectedNetLienTier, lienUnderwater } from "../lib/liens.mjs";

const src = (sources, erisa_funding_status = "unknown") => ({
  value: { sources, erisa_funding_status },
});

test("no lien source → none", () => {
  assert.equal(projectedNetLienTier({ lien_sources: src([]) }).tier, "none");
  assert.equal(projectedNetLienTier({}).tier, "none");
});

test("Medi-Cal (most reducible) does NOT read heavy", () => {
  const r = projectedNetLienTier({ lien_sources: src(["medi_cal"]) });
  assert.equal(r.tier, "light");
  assert.equal(r.reducibility_unknown, false);
});

test("ERISA self-funded reads heavy (the disposition-flipper)", () => {
  const r = projectedNetLienTier({ lien_sources: src(["erisa"], "self_funded") });
  assert.equal(r.tier, "heavy");
  assert.equal(r.worst_source, "erisa_selffunded");
});

test("ERISA with unknown funding status abstains → unknown/DEVELOP, never worst-case", () => {
  const r = projectedNetLienTier({ lien_sources: src(["erisa"], "unknown") });
  assert.equal(r.tier, "unknown");
  assert.equal(r.reducibility_unknown, true);
});

test("an explicitly unknown source forces reducibility_unknown", () => {
  const r = projectedNetLienTier({ lien_sources: src(["medi_cal", "unknown"]) });
  assert.equal(r.tier, "unknown");
  assert.equal(r.reducibility_unknown, true);
});

test("gross-size hint scales the tier", () => {
  const light = projectedNetLienTier({ lien_sources: src(["medi_cal"]), grossLoadHint: "light" });
  const heavy = projectedNetLienTier({ lien_sources: src(["medi_cal"]), grossLoadHint: "heavy" });
  assert.equal(light.tier, "light");
  assert.equal(heavy.tier, "moderate"); // big gross of even a reducible lien compresses more
});

test("lienUnderwater fires only on heavy net + min-limits + no anchors", () => {
  const heavyErisa = src(["erisa"], "self_funded");
  assert.equal(
    lienUnderwater({ lien_sources: heavyErisa, minLimitsSignal: true, objectiveAnchors: false }).fired,
    true
  );
  // Objective anchors present → never underwater from intake.
  assert.equal(
    lienUnderwater({ lien_sources: heavyErisa, minLimitsSignal: true, objectiveAnchors: true }).fired,
    false
  );
  // Reducible lien → not underwater even at min limits.
  assert.equal(
    lienUnderwater({ lien_sources: src(["medi_cal"]), minLimitsSignal: true, objectiveAnchors: false }).fired,
    false
  );
  // Unknown reducibility → review, not a cap.
  const unk = lienUnderwater({ lien_sources: src(["erisa"], "unknown"), minLimitsSignal: true, objectiveAnchors: false });
  assert.equal(unk.fired, false);
  assert.equal(unk.review, true);
});

test("LIEN_REDUCIBILITY is frozen and ranks Medi-Cal below ERISA self-funded", () => {
  assert.ok(LIEN_REDUCIBILITY.medi_cal.pass_through < LIEN_REDUCIBILITY.erisa_selffunded.pass_through);
  assert.throws(() => {
    "use strict";
    LIEN_REDUCIBILITY.medi_cal = {};
  });
});
