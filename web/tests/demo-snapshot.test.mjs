// P0-A: composeLeakReport(DEMO_DOC) is the SINGLE source of truth for the demo
// firm's page-one numbers. The Statement PDF headline (strong-row sum) and the
// on-site SampleStatement both derive from this snapshot, so all three reconcile
// to ONE number. This test pins that number and the reconciliation invariant.

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_SNAPSHOT, DEMO_MODEL } from "../src/lib/leak-report/demo-snapshot.mjs";
import { DEMO_DOC } from "../src/pdf/demo-fixture.mjs";
import { composeLeakReport } from "../src/lib/leak-report/compose.mjs";
import { falseAlarmFooter } from "../src/pdf/doc-helpers.mjs";

test("snapshot headline = arithmetic sum of the strong, non-expired demo rows", () => {
  const strong = DEMO_DOC.leaks.filter((l) => l.confidence === "strong" && !l.statuteExpired);
  const low = strong.reduce((a, l) => a + l.feeLowCents, 0);
  const high = strong.reduce((a, l) => a + l.feeHighCents, 0);
  assert.equal(DEMO_SNAPSHOT.headlineLowCents, low);
  assert.equal(DEMO_SNAPSHOT.headlineHighCents, high);
  // J.R. ($18k–$45k) + M.E. ($15k–$50k) = $33k–$95k.
  assert.equal(low, 3300000);
  assert.equal(high, 9500000);
  assert.equal(DEMO_SNAPSHOT.headlineRange, "$33,000 to $95,000");
});

test("snapshot matches composeLeakReport(DEMO_DOC) exactly (single source of truth)", () => {
  const model = composeLeakReport(DEMO_DOC);
  assert.equal(DEMO_SNAPSHOT.headlineLowCents, model.schedule.headlineLow);
  assert.equal(DEMO_SNAPSHOT.headlineHighCents, model.schedule.headlineHigh);
  assert.equal(DEMO_SNAPSHOT.strongCount, model.pageOne.count);
  assert.equal(DEMO_SNAPSHOT.recoverableCount, model.pageOne.recoverable);
  assert.equal(DEMO_SNAPSHOT.reportId, model.meta.reportId);
});

test("ledger shows exactly the counted strong rows, low end quoted", () => {
  assert.equal(DEMO_SNAPSHOT.ledger.length, DEMO_SNAPSHOT.strongCount);
  assert.deepEqual(
    DEMO_SNAPSHOT.ledger.map((r) => r.initials),
    ["J.R.", "M.E."],
  );
  assert.equal(DEMO_SNAPSHOT.ledger[0].feeLow, "$18,000");
});

test("compose exposes the page-one strong/moderate split and a dated 3-action box", () => {
  const model = DEMO_MODEL;
  assert.equal(model.pageOne.split.strong, 2);
  assert.equal(model.pageOne.split.moderate, 2);
  assert.equal(model.pageOne.threeActions.length, 3);
  assert.ok(model.pageOne.threeActions.every((a) => a.includes("Assign to: ___")));
});

test("compose exposes a per-exhibit fee derivation line (P0-C)", () => {
  const model = DEMO_MODEL;
  assert.ok(model.exhibits.length >= 1);
  assert.ok(model.exhibits.every((e) => typeof e.feeDerivation === "string" && e.feeDerivation.includes("case value")));
  assert.ok(model.exhibits.every((e) => e.confidence === "strong"));
});

test("compose carries the published false-alarm footer line (P0-D)", () => {
  // Default (no false-alarm passed) -> source-only fallback.
  assert.equal(DEMO_MODEL.falseAlarmLine, falseAlarmFooter());
  // With a rate -> the published line.
  const withRate = composeLeakReport(DEMO_DOC, { falseAlarm: { ratePct: 7, updatedDate: "Jul 7, 2026" } });
  assert.match(withRate.falseAlarmLine, /published false-alarm rate is 7%/);
});
