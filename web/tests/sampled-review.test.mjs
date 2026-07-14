// Sampled-review feature-flag tests: the flag helper itself, and the flag-gated
// analyst sign-off on the Intake Leak Report. The attestation branches live in
// pdf-doc-helpers.test.mjs; the provenance classifier in review-router.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { isSampledReviewEnabled } from "../analysis/flags.mjs";
import { analystSignoff } from "../src/lib/leak-report/copy.mjs";

test("isSampledReviewEnabled: OFF by default and for non-truthy values", () => {
  assert.equal(isSampledReviewEnabled({}), false);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: undefined }), false);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "false" }), false);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "0" }), false);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "no" }), false);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "" }), false);
});

test("isSampledReviewEnabled: ON only for 'true' | '1' (trim/case-insensitive)", () => {
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "true" }), true);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "TRUE" }), true);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: " true " }), true);
  assert.equal(isSampledReviewEnabled({ SAMPLED_REVIEW_ENABLED: "1" }), true);
});

test("analystSignoff: flag OFF is byte-identical to the current sign-off", () => {
  const off = analystSignoff({ env: {} });
  assert.match(off, /I personally reviewed this report before it was released/);
  assert.doesNotMatch(off, /random sample of the remainder/);
  // The reserved-term + not-legal-advice tail is present.
  assert.match(off, /It is not a certified financial audit and it is not legal advice\./);
});

test("analystSignoff: flag ON narrows to the sampled-review sign-off, tail preserved", () => {
  const on = analystSignoff({ env: { SAMPLED_REVIEW_ENABLED: "true" } });
  assert.match(on, /I personally reviewed every high-value flag/);
  assert.match(on, /random sample of the remainder/);
  assert.match(on, /Analyst-reviewed/);
  assert.match(on, /Engine-scored, evidence-verified/);
  // The reserved-term + not-legal-advice tail must survive in BOTH modes.
  assert.match(on, /It is not a certified financial audit and it is not legal advice\./);
});
