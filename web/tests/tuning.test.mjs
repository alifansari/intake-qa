// Tests for the tuning loop (Phase 5): precision math with the didn't-convert
// axis kept separate, the sample-size gate, downgrade-over-suppression,
// protected-trigger immunity + the friction flow, hysteresis restore, and the
// override application semantics (including the loosened marker mergeConfig
// honors).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeTriggerStats,
  proposeTunings,
  checkHysteresis,
  requestProtectedLoosening,
  frictionPhraseFor,
  applyProposalToOverrides,
  MIN_SAMPLE,
  PRECISION_FLOOR,
} from "../src/lib/tuning/engine.mjs";
import { mergeConfig } from "../src/lib/escalation/engine.mjs";

function rows(triggerKey, { tp = 0, fp = 0, rcbo = 0, converted = 0, notConverted = 0 } = {}) {
  const out = [];
  for (let i = 0; i < tp; i++)
    out.push({ trigger_key: triggerKey, disposition: "true_positive", converted: i < converted ? true : i < converted + notConverted ? false : null });
  for (let i = 0; i < fp; i++) out.push({ trigger_key: triggerKey, disposition: "false_positive" });
  for (let i = 0; i < rcbo; i++) out.push({ trigger_key: triggerKey, disposition: "right_call_bad_outcome" });
  return out;
}

test("precision = tp/(tp+fp); rcbo excluded; conversion tracked separately", () => {
  const stats = computeTriggerStats(
    rows("catastrophic_treatment", { tp: 6, fp: 2, rcbo: 4, converted: 3, notConverted: 3 }),
  );
  const s = stats.get("catastrophic_treatment");
  assert.equal(s.fired, 12);
  assert.equal(s.precision, 6 / 8, "rcbo does not dilute precision");
  assert.equal(s.converted, 3);
  assert.equal(s.not_converted, 3);
});

test("didn't-convert true positives never lower precision", () => {
  // 10 true positives, none converted: precision stays 1.0.
  const stats = computeTriggerStats(
    rows("clear_liability_treated", { tp: 10, notConverted: 10 }),
  );
  assert.equal(stats.get("clear_liability_treated").precision, 1);
  assert.deepEqual(proposeTunings(stats, {}), [], "no quieting proposal for real cases that didn't sign");
});

test("sample-size gate: noisy but tiny samples propose nothing", () => {
  const stats = computeTriggerStats(rows("catastrophic_treatment", { tp: 1, fp: MIN_SAMPLE - 2 }));
  assert.deepEqual(proposeTunings(stats, {}), []);
});

test("low precision at adequate sample proposes a TIER DOWNGRADE first", () => {
  const stats = computeTriggerStats(rows("catastrophic_treatment", { tp: 3, fp: 9 }));
  const props = proposeTunings(stats, {});
  assert.equal(props.length, 1);
  assert.equal(props[0].proposed_action, "tier_downgrade");
  assert.equal(props[0].current_tier, "warm");
  assert.equal(props[0].proposed_tier, "flagged");
  assert.ok(props[0].rationale.precision < PRECISION_FLOOR);
});

test("an already-flagged noisy trigger is proposed for suppression (last resort)", () => {
  const stats = computeTriggerStats(rows("other_matter", { tp: 2, fp: 10 }));
  const props = proposeTunings(stats, {});
  assert.equal(props[0].proposed_action, "suppress");
  assert.equal(props[0].proposed_tier, null);
});

test("PROTECTED triggers are never auto-proposed no matter how noisy", () => {
  const stats = computeTriggerStats(rows("gov_claims_notice", { tp: 1, fp: 30 }));
  assert.deepEqual(proposeTunings(stats, {}), []);
});

test("hysteresis: a downgraded trigger with a missed real case proposes instant restore", () => {
  const overrides = { catastrophic_treatment: { tier: "flagged" } };
  const restore = checkHysteresis("catastrophic_treatment", overrides);
  assert.equal(restore.proposed_action, "tier_restore");
  assert.equal(restore.proposed_tier, "warm");
  assert.equal(restore.sample_size, 1, "bypasses the sample gate by design");
  assert.equal(checkHysteresis("catastrophic_treatment", {}), null, "no restore when not downgraded");
});

test("protected loosening demands the EXACT friction phrase", () => {
  const wrong = requestProtectedLoosening("sol_near", "warm", "loosen sol_near");
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "friction_phrase_mismatch");
  const right = requestProtectedLoosening("sol_near", "warm", frictionPhraseFor("sol_near"));
  assert.ok(right.ok);
  assert.equal(right.proposal.proposed_action, "loosen_protected");
  assert.ok(right.proposal.requires_friction);
  const notProtected = requestProtectedLoosening("other_matter", "flagged", frictionPhraseFor("other_matter"));
  assert.equal(notProtected.ok, false);
  assert.equal(notProtected.reason, "not_protected_use_normal_flow");
});

test("applying proposals updates overrides; loosened marker set only by the friction path", () => {
  let overrides = {};
  overrides = applyProposalToOverrides(overrides, {
    trigger_key: "catastrophic_treatment",
    proposed_action: "tier_downgrade",
    proposed_tier: "flagged",
  });
  assert.deepEqual(overrides.catastrophic_treatment, { tier: "flagged", enabled: true });

  overrides = applyProposalToOverrides(overrides, {
    trigger_key: "other_matter",
    proposed_action: "suppress",
  });
  assert.equal(overrides.other_matter.enabled, false);

  overrides = applyProposalToOverrides(overrides, {
    trigger_key: "sol_near",
    proposed_action: "loosen_protected",
    proposed_tier: "warm",
  });
  assert.deepEqual(overrides.sol_near, { tier: "warm", enabled: true, loosened: true });
});

test("mergeConfig honors a protected downgrade ONLY with the loosened marker", () => {
  const plain = mergeConfig({ sol_near: { tier: "warm" } });
  assert.equal(plain.get("sol_near").tier, "hot", "ordinary override ignored");
  const loosened = mergeConfig({ sol_near: { tier: "warm", loosened: true } });
  assert.equal(loosened.get("sol_near").tier, "warm", "friction-approved loosening honored");
  const stillOn = mergeConfig({ sol_near: { enabled: false, loosened: true } });
  assert.equal(stillOn.get("sol_near").enabled, true, "protected can never be disabled, loosened or not");
});

test("tier_restore clears the loosened marker", () => {
  let overrides = { sol_near: { tier: "warm", enabled: true, loosened: true } };
  overrides = applyProposalToOverrides(overrides, {
    trigger_key: "sol_near",
    proposed_action: "tier_restore",
    proposed_tier: "hot",
  });
  assert.equal(overrides.sol_near.loosened, undefined);
  assert.equal(overrides.sol_near.tier, "hot");
});
