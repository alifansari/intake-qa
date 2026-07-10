// Tests for the escalation engine (Phase 3): trigger derivation across the
// four families, tier config overrides (protected triggers immune to
// silencing/downgrade), over-escalation-on-error, and the alert chokepoint
// gates (kill switch / test mode / mock-only).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TRIGGERS,
  deriveEscalations,
  mergeConfig,
  highestTier,
  getTrigger,
} from "../src/lib/escalation/engine.mjs";
import { sendAlert, createMockSender } from "../src/lib/escalation/alert-sender.mjs";

// A strong MVA record that fires case_value triggers.
const MVA_RECORD = {
  matter_type: "mva",
  incident: { emergency: "no", prior_representation: "no" },
  path_data: { fault: "other", injured: "treated", treatment: "er" },
  routing: { sol: { status: "ok" }, reasons: [] },
};

test("registry sanity: unique keys, valid families and tiers", () => {
  const keys = TRIGGERS.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const t of TRIGGERS) {
    assert.ok(["case_value", "time_decay", "competitive_loss", "human_judgment"].includes(t.family), t.key);
    assert.ok(["hot", "warm", "flagged"].includes(t.tier), t.key);
  }
});

test("all four trigger families are represented in the registry", () => {
  const families = new Set(TRIGGERS.map((t) => t.family));
  assert.equal(families.size, 4);
});

test("emergency → hot; sol_near → hot; both protected", () => {
  const out = deriveEscalations({
    ...MVA_RECORD,
    incident: { emergency: "yes" },
    routing: { sol: { status: "near" }, reasons: [] },
  });
  const keys = out.map((e) => e.trigger_key);
  assert.ok(keys.includes("emergency"));
  assert.ok(keys.includes("sol_near"));
  for (const k of ["emergency", "sol_near"]) {
    assert.equal(out.find((e) => e.trigger_key === k).tier, "hot");
    assert.ok(getTrigger(k).protected);
  }
});

test("strong MVA fires case_value triggers at warm", () => {
  const out = deriveEscalations(MVA_RECORD);
  const keys = out.map((e) => e.trigger_key);
  assert.ok(keys.includes("clear_liability_treated"));
  assert.ok(keys.includes("catastrophic_treatment"));
  assert.equal(highestTier(out), "warm");
});

test("prospect shopping other firms → competitive_loss warm", () => {
  const out = deriveEscalations({
    ...MVA_RECORD,
    incident: { prior_representation: "talked" },
  });
  const hit = out.find((e) => e.trigger_key === "shopping_other_firms");
  assert.ok(hit);
  assert.equal(hit.family, "competitive_loss");
});

test("low routing confidence → flagged human_judgment", () => {
  const out = deriveEscalations({
    matter_type: "premises",
    incident: {},
    path_data: {},
    routing: { sol: { status: "ok" }, reasons: ["low_confidence"] },
  });
  const hit = out.find((e) => e.trigger_key === "low_confidence_routing");
  assert.equal(hit.tier, "flagged");
});

test("evidence decay fires only while hazard is undocumented", () => {
  const base = {
    matter_type: "premises",
    incident: {},
    path_data: { hazard_still_present: "still_there" },
    routing: { sol: { status: "ok" }, reasons: [] },
  };
  assert.ok(deriveEscalations(base).some((e) => e.trigger_key === "evidence_decay"));
  const withPhotos = {
    ...base,
    path_data: { ...base.path_data, photos: [{ filename: "hazard.jpg" }] },
  };
  assert.ok(!deriveEscalations(withPhotos).some((e) => e.trigger_key === "evidence_decay"));
});

test("config can downgrade or disable NON-protected triggers", () => {
  const out = deriveEscalations(MVA_RECORD, {
    clear_liability_treated: { tier: "flagged" },
    catastrophic_treatment: { enabled: false },
  });
  assert.equal(out.find((e) => e.trigger_key === "clear_liability_treated").tier, "flagged");
  assert.ok(!out.some((e) => e.trigger_key === "catastrophic_treatment"));
});

test("PROTECTED triggers ignore disable and downgrade from ordinary config", () => {
  const out = deriveEscalations(
    { ...MVA_RECORD, incident: { emergency: "yes" } },
    { emergency: { enabled: false, tier: "flagged" } },
  );
  const hit = out.find((e) => e.trigger_key === "emergency");
  assert.ok(hit, "protected trigger cannot be silenced");
  assert.equal(hit.tier, "hot", "protected trigger cannot be downgraded");
});

test("protected triggers CAN be upgraded (warm → hot) by config", () => {
  const merged = mergeConfig({ evidence_decay: { tier: "hot" } });
  assert.equal(merged.get("evidence_decay").tier, "hot");
});

test("a throwing rule over-escalates instead of failing silent", () => {
  // null record makes several derive() calls touch undefined properties —
  // optional chaining handles most, but the contract is: an error fires.
  const broken = { get incident() { throw new Error("boom"); }, path_data: {}, routing: {} };
  const out = deriveEscalations(broken);
  assert.ok(out.some((e) => e.trigger_key === "emergency"), "error → fire (safe default)");
});

test("derivations are ordered hot → warm → flagged", () => {
  const out = deriveEscalations({
    ...MVA_RECORD,
    matter_type: "other",
    incident: { emergency: "yes", prior_representation: "talked" },
  });
  const ranks = out.map((e) => ({ hot: 0, warm: 1, flagged: 2 })[e.tier]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

// --- alert chokepoint -------------------------------------------------------

const ALERT = { escalationId: "e1", tier: "hot", trigger_key: "emergency", target: {} };

test("kill switch blocks everything (default ON)", async () => {
  const r = await sendAlert(ALERT, { env: {} });
  assert.deepEqual(r, { sent: false, simulated: false, skipped: true, reason: "kill_switch" });
});

test("test mode simulates through the mock, transmits nothing", async () => {
  const mock = createMockSender();
  const r = await sendAlert(ALERT, { env: { KILL_SWITCH: "false", TEST_MODE: "true" }, sender: mock });
  assert.equal(r.sent, false);
  assert.equal(r.simulated, true);
  assert.equal(mock.sent.length, 1);
  assert.equal(mock.sent[0].simulated, true);
});

test("even with kill switch and test mode off, the mock never transmits", async () => {
  const mock = createMockSender();
  const r = await sendAlert(ALERT, { env: { KILL_SWITCH: "false", TEST_MODE: "false" }, sender: mock });
  assert.equal(r.sent, false);
  assert.equal(r.simulated, true);
  assert.equal(r.reason, "no_real_sender");
});

test("a real sender only transmits with both gates open", async () => {
  const calls = [];
  const real = { kind: "real", deliver: async (a) => { calls.push(a); return { delivered: true }; } };
  const blocked = await sendAlert(ALERT, { env: { KILL_SWITCH: "false" }, sender: real });
  assert.equal(blocked.sent, false, "test mode still gates a real sender");
  const open = await sendAlert(ALERT, { env: { KILL_SWITCH: "false", TEST_MODE: "false" }, sender: real });
  assert.equal(open.sent, true);
  assert.equal(calls.length, 1);
});
