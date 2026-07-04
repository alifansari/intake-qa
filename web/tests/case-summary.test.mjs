// Tests for the Case-Ready Summary pass. The normalizer + text renderer are
// pure; the runner uses a fake summarizer (no network, no key). Asserts the memo
// is shaped/deduped safely and always carries the triage disclaimer.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCaseSummary,
  renderCaseSummaryText,
  runCaseSummary,
  SUMMARY_DISCLAIMER,
} from "../analysis/case-summary.mjs";

test("buildCaseSummary normalizes strings, dedupes lists, drops junk", () => {
  const memo = buildCaseSummary({
    caller_name: "  Dana Lee  ",
    callback_number: "",
    case_type: "Motor vehicle collision",
    incident_summary: "Rear-ended at a light.",
    injuries: ["Neck pain", "Neck pain", " ", { text: "Headaches" }, 42],
    open_questions: ["No photos mentioned"],
    urgency_flags: [],
  });
  assert.equal(memo.caller_name, "Dana Lee");
  assert.equal(memo.callback_number, null);
  assert.deepEqual(memo.injuries, ["Neck pain", "Headaches"]);
  assert.deepEqual(memo.treatment, []);
  assert.deepEqual(memo.open_questions, ["No photos mentioned"]);
  assert.equal(memo.disclaimer, SUMMARY_DISCLAIMER);
});

test("renderCaseSummaryText produces readable memo ending with the disclaimer", () => {
  const memo = buildCaseSummary({
    caller_name: "Dana Lee",
    case_type: "Motor vehicle collision",
    incident_summary: "Rear-ended at a light.",
    injuries: ["Neck pain"],
    open_questions: ["No photos mentioned"],
  });
  const text = renderCaseSummaryText(memo);
  assert.ok(text.includes("INTAKE MEMO"));
  assert.ok(text.includes("Caller: Dana Lee"));
  assert.ok(text.includes("- Neck pain"));
  assert.ok(text.includes("Open questions"));
  assert.ok(text.trim().endsWith(SUMMARY_DISCLAIMER));
});

test("runCaseSummary: fake summarizer -> normalized memo", async () => {
  const memo = await runCaseSummary({
    transcript: "irrelevant",
    summarizer: async () => ({
      caller_name: "Sam Ortiz",
      incident_summary: "Dog bite at a neighbor's yard.",
      injuries: ["Puncture wounds to left hand"],
      key_facts: ["Neighbor admitted the dog had bitten before"],
    }),
  });
  assert.equal(memo.caller_name, "Sam Ortiz");
  assert.deepEqual(memo.injuries, ["Puncture wounds to left hand"]);
  assert.equal(memo.disclaimer, SUMMARY_DISCLAIMER);
});
