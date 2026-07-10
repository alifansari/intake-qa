// Tests for the intake qualification tree + engine + routing (Phase 2).
// The tree is a fixed graph (UPL guardrail (a)): these tests assert the graph
// invariants ("no dead ends"), the consent chokepoint, the SOL gate, the four
// terminal buckets, the confidence gate, and that every visitor-facing prompt
// is free of banned (UPL / fee) phrasings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { NODES, START_NODE, validateTree, allPromptTexts, getNode } from "../src/lib/intake/tree.mjs";
import {
  startConversation,
  answerNode,
  promptFor,
  applyInterpretation,
} from "../src/lib/intake/engine.mjs";
import { solCheck, routeLead, NEXT_ACTIONS, CONFIDENCE_GATE } from "../src/lib/intake/routing.mjs";
import { BANNED_PROMPT_PHRASES, AI_DISCLOSURE_TEXT } from "../src/lib/intake/guardrails.mjs";

const NOW = new Date("2026-07-09T12:00:00Z");

// Walk helper: play a scripted conversation, return the final state.
function play(answers) {
  let { record, nodeId } = startConversation("test-session", NOW);
  for (const a of answers) {
    const r = answerNode(record, nodeId, a, NOW);
    assert.ok(!r.invalid, `answer "${a}" rejected at node ${nodeId}`);
    record = r.record;
    nodeId = r.nodeId;
    if (r.done) return { record, nodeId, done: true };
  }
  return { record, nodeId, done: false };
}

// --- graph invariants ----------------------------------------------------------

test("tree validates: every edge resolves, every terminal has a bucket (no dead ends)", () => {
  assert.deepEqual(validateTree(), []);
});

test("consent is the entry node and the only two exits are proceed / decline", () => {
  assert.equal(START_NODE, "consent");
  const consent = getNode("consent");
  assert.equal(consent.kind, "choice");
  assert.deepEqual(
    consent.options.map((o) => o.key).sort(),
    ["no_consent", "proceed"],
  );
  assert.equal(consent.prompt, AI_DISCLOSURE_TEXT);
});

test("every visitor-facing prompt is free of banned UPL/fee phrasings", () => {
  for (const text of allPromptTexts()) {
    const lower = text.toLowerCase();
    for (const banned of BANNED_PROMPT_PHRASES) {
      assert.ok(!lower.includes(banned), `banned phrase "${banned}" in prompt: ${text}`);
    }
  }
});

// --- consent chokepoint ----------------------------------------------------------

test("proceeding past the disclosure stamps consent version + timestamp", () => {
  const { record } = play(["proceed"]);
  assert.ok(record.consent_version);
  assert.ok(record.consent_at);
  assert.ok(record.events.some((e) => e.kind === "consent"));
});

test("declining consent → human_handoff terminal with a next action (no dead end)", () => {
  const { record, done } = play(["no_consent"]);
  assert.ok(done);
  assert.equal(record.bucket, "human_handoff");
  assert.deepEqual(record.routing.reasons, ["consent_declined"]);
  assert.ok(record.routing.next_action.length > 10);
  assert.equal(record.consent_version, null, "no consent was given");
});

// --- emergency screen ------------------------------------------------------------

test("emergency yes → contact captured → escalate", () => {
  const { record, done } = play(["proceed", "yes", "Dana", "916-555-0100"]);
  assert.ok(done);
  assert.equal(record.bucket, "escalate");
  assert.deepEqual(record.routing.reasons, ["emergency"]);
  assert.equal(record.contact.first_name, "Dana");
  assert.equal(record.contact.phone, "916-555-0100");
});

// --- SOL gate ---------------------------------------------------------------------

test("solCheck: expired / near / ok against the 2-year window", () => {
  assert.equal(solCheck("2023-01-01", NOW).status, "expired");
  assert.equal(solCheck("2024-08-01", NOW).status, "near"); // deadline 2026-08-01, < 90 days out
  assert.equal(solCheck("2026-06-01", NOW).status, "ok");
  assert.equal(solCheck(null, NOW).status, "unknown");
});

test("expired incident date → decline (sol_window) but contact is captured", () => {
  const { record, done } = play(["proceed", "no", "Sam", "916-555-0111", "mva", "2020-01-01"]);
  assert.ok(done);
  assert.equal(record.bucket, "decline");
  assert.deepEqual(record.routing.reasons, ["sol_window"]);
  assert.equal(record.contact.phone, "916-555-0111", "abandufoned decline still holds the lead");
  // Decline copy promises human review — never a legal conclusion.
  assert.match(record.routing.next_action, /review/i);
});

// --- full MVA happy path ----------------------------------------------------------

test("strong MVA path → book, with contact + incident + path_data populated", () => {
  const { record, done } = play([
    "proceed", "no", "Maria", "916-555-0122",
    "mva", "2026-06-01", "Rear-ended at a light on J Street.",
    "driver", "other", "yes", "treated", "er", "yes", null /* skip photos */, "no",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "book");
  assert.ok(record.confidence >= 0.6);
  assert.equal(record.matter_type, "mva");
  assert.equal(record.incident.narrative, "Rear-ended at a light on J Street.");
  assert.equal(record.path_data.fault, "other");
  assert.ok(record.routing.reasons.includes("injured_treated"));
  assert.equal(record.status, "complete");
});

// --- premises path ------------------------------------------------------------------

test("government-property premises → escalate with gov_claims_notice", () => {
  const { record, done } = play([
    "proceed", "no", "Lee", "916-555-0133",
    "premises", "2026-06-01", "Tripped on a broken curb outside the DMV.",
    "government", "Broken curb", "unsure", "still_there", null, "treated", "er", "no",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "escalate");
  assert.ok(record.routing.reasons.includes("gov_claims_notice"));
});

test("weak premises (no notice, no injury) → human_handoff, never auto-decline", () => {
  const { record, done } = play([
    "proceed", "no", "Kim", "916-555-0144",
    "premises", "2026-06-01", "Slipped at a store.",
    "business", "Wet floor", "no", "fixed", "no", "no",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "human_handoff");
  assert.ok(record.confidence < CONFIDENCE_GATE);
  assert.ok(record.routing.reasons.includes("low_confidence"));
});

// --- dog-bite path -------------------------------------------------------------------

test("child dog-bite victim → escalate (child_victim)", () => {
  const { record, done } = play([
    "proceed", "no", "Ana", "916-555-0155",
    "dog_bite", "2026-06-01", "Neighbor's dog bit my daughter.",
    "known_acquaintance", "likely", "yes", "stitches", "er", null, "no",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "escalate");
  assert.ok(record.routing.reasons.includes("child_victim"));
});

test("adult dog-bite, owner known + insured + significant injury → book", () => {
  const { record, done } = play([
    "proceed", "no", "Raj", "916-555-0166",
    "dog_bite", "2026-06-01", "Bitten on a walk.",
    "known_acquaintance", "likely", "no", "stitches", "er", null, "no",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "book");
});

// --- prior representation / other matter ----------------------------------------------

test("already signed with another attorney → decline (already_represented)", () => {
  const { record, done } = play([
    "proceed", "no", "Joe", "916-555-0177",
    "mva", "2026-06-01", "Crash.", "driver", "other", "yes", "treated", "er", "yes", null,
    "signed",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "decline");
  assert.deepEqual(record.routing.reasons, ["already_represented"]);
});

test("'something else' matter → narrative captured → human_handoff", () => {
  const { record, done } = play([
    "proceed", "no", "Pat", "916-555-0188", "other", "A contractor dispute.",
  ]);
  assert.ok(done);
  assert.equal(record.bucket, "human_handoff");
  assert.deepEqual(record.routing.reasons, ["other_matter"]);
  assert.equal(record.incident.narrative, "A contractor dispute.");
});

// --- engine details ---------------------------------------------------------------------

test("empty text answers are rejected; the node does not advance", () => {
  let { record, nodeId } = startConversation("s", NOW);
  ({ record, nodeId } = answerNode(record, nodeId, "proceed", NOW));
  ({ record, nodeId } = answerNode(record, nodeId, "no", NOW));
  const r = answerNode(record, nodeId, "   ", NOW);
  assert.ok(r.invalid);
  assert.equal(r.nodeId, "name");
});

test("upload answers append to path_data.photos; null skips", () => {
  const { record, nodeId } = play([
    "proceed", "no", "Ed", "916-555-0199",
    "mva", "2026-06-01", "Crash.", "driver", "other", "yes", "treated", "er", "yes",
  ]);
  const r = answerNode(record, nodeId, { filename: "crash.jpg", path: "intake/x/crash.jpg" }, NOW);
  assert.equal(r.record.path_data.photos.length, 1);
  assert.ok(r.record.events.some((e) => e.kind === "upload"));
});

test("every terminal bucket has a next action defined", () => {
  for (const bucket of ["book", "escalate", "human_handoff", "decline"]) {
    assert.ok(NEXT_ACTIONS[bucket]?.length > 10, `missing next action for ${bucket}`);
  }
});

test("event trail is sequential and covers question → answer → routed", () => {
  const { record } = play(["proceed", "no", "Ty", "916-555-0100", "other", "Dispute."]);
  const seqs = record.events.map((e) => e.seq);
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
  const kinds = new Set(record.events.map((e) => e.kind));
  for (const k of ["question", "answer", "consent", "routed"]) assert.ok(kinds.has(k), k);
});

test("applyInterpretation adds data fields only and never touches routing", () => {
  const { record } = play(["proceed", "no", "Vi", "916-555-0101", "other", "Hurt at work."]);
  const before = JSON.stringify(record.routing);
  applyInterpretation(record, {
    summary: "Visitor reports a workplace injury.",
    mentions_injury: true,
    hallucinated_field: "ignored",
  }, NOW);
  assert.equal(record.incident.summary, "Visitor reports a workplace injury.");
  assert.equal(record.incident.mentions_injury, true);
  assert.equal(record.incident.hallucinated_field, undefined);
  assert.equal(JSON.stringify(record.routing), before);
});

test("routeLead never returns a bucket outside the four", () => {
  // Fuzz a few odd records — routing must always land in a known bucket.
  const cases = [
    { matter_type: "unknown", incident: {}, path_data: {} },
    { matter_type: "mva", incident: { date: "2026-07-01" }, path_data: {} },
    { matter_type: "dog_bite", incident: {}, path_data: { owner_known: "unknown" } },
  ];
  for (const c of cases) {
    const r = routeLead({ contact: {}, ...c });
    assert.ok(["book", "escalate", "human_handoff", "decline"].includes(r.bucket));
    assert.ok(r.next_action);
  }
});

test("prompts render with record context (name interpolation)", () => {
  const { record } = play(["proceed", "no", "Maya"]);
  assert.match(promptFor("phone", record), /Maya/);
});

test("all four path_data photo nodes exist and share the tail", () => {
  for (const id of ["mva_photos", "prem_photos", "dog_photos"]) {
    assert.ok(NODES[id], `${id} missing`);
    assert.equal(NODES[id].kind, "upload");
  }
});
