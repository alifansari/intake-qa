// Integration tests: the six golds are internally consistent — each gold's
// LLM-output section validates against the schema, and running the CODE
// pipeline (gates → decision table → confidence) over it reproduces the
// gold's expected pipeline verdict exactly. Also pins the gold order.
// Zero network — the golds are fixtures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOLD_ORDER, loadGold, buildGoldBlock, buildAllGoldBlocks } from "../lib/golds.mjs";
import { parseModelResponse } from "../lib/parse.mjs";
import { validateLlmOutput } from "../lib/validate.mjs";
import { evaluateGates } from "../lib/gates.mjs";
import { decideDisposition } from "../lib/decision-table.mjs";
import { assessConfidence } from "../lib/confidence.mjs";
import { splitFirmConfig, parsePartB, normalizeConfig } from "../lib/config.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const GOLDS_DIR = join(PKG, "golds");
const TEMPLATE = join(PKG, "firm-config-template.md");

const { partA, partBYaml } = splitFirmConfig(readFileSync(TEMPLATE, "utf8"));
const CONFIG = normalizeConfig(parsePartB(partBYaml));

test("firm config template splits into a prompt-visible PART A and code-side PART B", () => {
  assert.match(partA, /FIRM CONFIG — PART A/);
  assert.match(partA, /case_types_accepted/);
  assert.ok(!partA.includes("posture"), "PART A must not leak posture");
  assert.ok(!partA.includes("esign"), "esign_on_call_enabled lives in PART B, not the prompt");
  assert.equal(CONFIG.esign_on_call_enabled, true);
  assert.equal(CONFIG.posture_default, "selective");
  assert.equal(CONFIG.posture_by_case_type.mva_standard, "volume");
  assert.equal(CONFIG.trial_capital, false);
  assert.equal(CONFIG.mist_handling, "develop");
  assert.equal(CONFIG.thin_threshold_by_case_type.dog_bite, 1);
});

test("gold order is pinned: six golds, contrastive pair adjacent, does not end on a decline", () => {
  assert.equal(GOLD_ORDER.length, 6);
  assert.deepEqual(GOLD_ORDER.slice(0, 2), ["gold-1.md", "gold-2.md"]); // contrastive pair
  const last = loadGold(GOLDS_DIR, GOLD_ORDER[GOLD_ORDER.length - 1]);
  assert.notEqual(last.expectedVerdict.recommended_disposition, "decline_with_grace");
  // ORDER.md documents the same list.
  const orderDoc = readFileSync(join(GOLDS_DIR, "ORDER.md"), "utf8");
  for (const f of GOLD_ORDER) assert.ok(orderDoc.includes(f.replace(".md", "")), f);
});

for (const filename of GOLD_ORDER) {
  test(`${filename}: LLM output validates and the code pipeline reproduces the expected verdict`, () => {
    const gold = loadGold(GOLDS_DIR, filename);
    assert.ok(gold.partA.includes("Meridian Injury Law"), "gold carries PART A");
    assert.ok(gold.transcript.includes("INTAKE:"), "gold carries a transcript");
    assert.ok(gold.expectedVerdict, "gold carries an expected pipeline verdict");

    // The section shown to the model must NOT contain the expected verdict
    // or calibration notes.
    assert.ok(!gold.goldOutput.includes("EXPECTED PIPELINE VERDICT"));
    assert.ok(!gold.goldOutput.includes("CALIBRATION NOTES"));
    assert.ok(!gold.goldOutput.includes("recommended_disposition"));

    const { analysis, parsed } = parseModelResponse(gold.goldOutput);
    assert.ok(analysis.length > 100, "analysis block present");
    assert.ok(parsed, "gold JSON parses");
    const v = validateLlmOutput(parsed);
    assert.deepEqual(v.errors, [], "gold validates");

    const gates = evaluateGates(parsed.extracted_facts, CONFIG);
    const rec = decideDisposition({ llmOutput: parsed, gates, config: CONFIG });
    const conf = assessConfidence(parsed, CONFIG);
    const exp = gold.expectedVerdict;

    assert.equal(gates.g1.fired, exp.gates.g1_underwater, "g1");
    assert.equal(gates.g2.fired, exp.gates.g2_deadline_trap, "g2");
    assert.equal(gates.g3.fired, exp.gates.g3_client_risk, "g3");
    assert.equal(gates.g4.fired, exp.gates.g4_trial_capital, "g4");
    assert.equal(rec.recommended_disposition, exp.recommended_disposition, "disposition");
    assert.equal(rec.value_tier, exp.value_tier, "value tier");
    assert.equal(rec.posture_applied, exp.posture_applied, "posture");
    assert.equal(rec.mist_flag, exp.mist_flag, "mist flag");
    assert.equal(rec.attorney_review_required, exp.attorney_review_required, "review flag");
    assert.deepEqual(rec.urgency_flags, exp.urgency_flags, "urgency flags");
    assert.equal(conf.tier, exp.confidence_tier, "confidence tier");
    assert.equal(conf.abstained, exp.abstained, "abstained");
    if (exp.g1_trigger_quote) assert.equal(gates.g1.trigger_quote, exp.g1_trigger_quote);
    if (exp.g2_trigger_quote) assert.equal(gates.g2.trigger_quote, exp.g2_trigger_quote);
    if (exp.develop_payload) {
      // v2.2 added develop_payload.ranked_actions (facts-dependent, not pinned
      // in the gold). Compare the pinned core exactly; assert the new field is
      // a well-formed array separately so the regression guarantee holds on the
      // calibrated parts.
      const { ranked_actions, ...core } = rec.develop_payload;
      assert.deepEqual(core, exp.develop_payload, "develop payload (pinned core)");
      assert.ok(Array.isArray(ranked_actions), "develop payload carries a ranked_actions array");
    }
    if (exp.refer_comparison_expected) assert.ok(rec.refer_comparison, "refer comparison surfaced");
  });
}

test("few-shot block hides everything downstream of the LLM contract", () => {
  const block = buildAllGoldBlocks(GOLDS_DIR);
  assert.ok(block.includes("===== WORKED EXAMPLE 1 ====="));
  assert.ok(block.includes("===== END WORKED EXAMPLE 6 ====="));
  assert.ok(!block.includes("EXPECTED PIPELINE VERDICT"));
  assert.ok(!block.includes("CALIBRATION NOTES"));
  assert.ok(!block.includes("recommended_disposition"));
  assert.ok(!/\bposture\b/.test(block), "posture never enters the prompt");
  // Order inside the block matches the pinned order (call_ids are unique).
  const idx = GOLD_ORDER.map((f) =>
    block.indexOf(`"call_id": "${f.replace(".md", "")}"`)
  );
  for (let i = 0; i < idx.length; i++) assert.ok(idx[i] !== -1, `call_id ${i + 1} present`);
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] > idx[i - 1], "pinned order preserved");
});

test("buildGoldBlock structure carries input → correct-output pairing", () => {
  const b = buildGoldBlock(loadGold(GOLDS_DIR, "gold-1.md"), 1);
  assert.ok(b.indexOf("[FIRM CONFIG — PART A]") < b.indexOf("[TRANSCRIPT]"));
  assert.ok(b.indexOf("[TRANSCRIPT]") < b.indexOf("[CORRECT OUTPUT"));
  assert.ok(b.includes("<analysis>"));
});
