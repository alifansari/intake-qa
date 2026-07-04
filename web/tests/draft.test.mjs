// Tests for the SMS drafting layer: template loading, the compliance guard
// (validateDraft), and drafting a compliant first message for each synthetic
// signable lead with an injected FAKE drafter (no Claude, no network, no cost).

import { test } from "node:test";
import assert from "node:assert/strict";

import { loadTemplates, getTemplate } from "../messaging/templates.mjs";
import {
  validateDraft,
  draftFirstMessage,
  fillTemplate,
  MAX_SMS_CHARS,
} from "../messaging/draft.mjs";

const FIRM = "Meridian Injury Law";

const SIGNABLE_LEADS = [
  { name: "Sam Ortiz" },
  { name: "Dana Whitfield" },
  { name: "Marcus Bell" },
  { name: "Priya Nair" },
];

test("loadTemplates returns the 3 approved templates", () => {
  const templates = loadTemplates();
  assert.equal(templates.length, 3);
  for (const t of templates) {
    assert.ok(t.id, "template has an id");
    assert.ok(t.name, "template has a name");
    assert.ok(t.body.length > 0, "template has a body");
  }
  // First template is the default and includes the opt-out line.
  assert.ok(/stop/i.test(getTemplate().body), "default template has opt-out");
});

test("validateDraft rejects legal advice / guarantees", () => {
  const bad = `Hi, this is ${FIRM}. You have a strong case and we guarantee you'll win. Reply STOP to opt out.`;
  const errors = validateDraft(bad, { firstMessage: true, firmName: FIRM });
  assert.ok(errors.length > 0, "should reject guarantees / merits talk");
});

test("validateDraft rejects an over-length message", () => {
  const long = `Hi, this is ${FIRM}. ${"a".repeat(MAX_SMS_CHARS)} Reply STOP to opt out.`;
  const errors = validateDraft(long, { firstMessage: true, firmName: FIRM });
  assert.ok(errors.some((e) => /too long/.test(e)));
});

test("validateDraft requires opt-out on the first message", () => {
  const noOptOut = `Hi, this is ${FIRM} following up on your call. Is now a good time?`;
  const errors = validateDraft(noOptOut, { firstMessage: true, firmName: FIRM });
  assert.ok(errors.some((e) => /opt-out/.test(e)));
});

test("validateDraft requires the firm be named", () => {
  const noFirm = "Hi, following up on your call. Reply STOP to opt out.";
  const errors = validateDraft(noFirm, { firstMessage: true, firmName: FIRM });
  assert.ok(errors.some((e) => /firm/.test(e)));
});

test("draftFirstMessage produces a compliant draft for each signable lead", async () => {
  const template = getTemplate();

  // Fake drafter: fills the approved template (already compliant). No network.
  const fakeDrafter = async ({ user }) => {
    const firstName =
      user.match(/CALLER FIRST NAME: (.+)/)?.[1]?.trim() || "there";
    return fillTemplate(template.body, { firmName: FIRM, firstName });
  };

  console.log("\nDrafted first-messages (synthetic signable leads):\n");
  for (const lead of SIGNABLE_LEADS) {
    const text = await draftFirstMessage({
      transcriptSummary: `Lost signable lead: ${lead.name}`,
      template,
      firmName: FIRM,
      callerName: lead.name,
      drafter: fakeDrafter,
    });
    // Passed the guard already (draftFirstMessage throws otherwise), re-assert:
    assert.deepEqual(
      validateDraft(text, { firstMessage: true, firmName: FIRM }),
      []
    );
    assert.ok(text.length <= MAX_SMS_CHARS);
    console.log(`  ${lead.name.padEnd(16)} -> ${text}`);
  }
  console.log("");
});

test("draftFirstMessage refuses when the drafter keeps violating rules", async () => {
  const template = getTemplate();
  const badDrafter = async () =>
    `We guarantee you'll win. Reply STOP to opt out.`;
  await assert.rejects(
    draftFirstMessage({
      transcriptSummary: "x",
      template,
      firmName: FIRM,
      callerName: "Test Person",
      drafter: badDrafter,
    }),
    /refused/
  );
});
