// § 64.1200(a)(10) revocation detection — "any reasonable means", no exclusive means.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRevocation, detectOptOut } from "../messaging/compliance.mjs";

test("the seven per se words are absolute proof of revocation (FCC 24-24 ¶11)", () => {
  for (const w of ["STOP", "stop", "unsubscribe", "cancel", "quit", "end", "revoke", "opt out", "optout"]) {
    const r = detectRevocation(w);
    assert.equal(r.revoked, true, `"${w}" must revoke`);
    assert.equal(r.basis, "per_se_keyword");
  }
});

test("REASONABLE-PERSON revocations with NO magic word are honored — the rule requires it", () => {
  // Every one of these was missed by keyword-only matching, and every one is
  // plainly a revocation to a reasonable person.
  const phrases = [
    "leave me alone",
    "take me off your list",
    "please remove me",
    "lose my number",
    "delete my number",
    "don't text me again",
    "do not contact me",
    "dont call me anymore",
    "I'm not interested",
    "I already have a lawyer",
    "we hired an attorney",
    "I'm represented",
    "wrong number",
  ];
  for (const p of phrases) {
    const r = detectRevocation(p);
    assert.equal(r.revoked, true, `"${p}" must revoke`);
    assert.equal(r.basis, "reasonable_person");
  }
});

test("a phrase carrying a per se word is honored on that basis (whichever basis, it revokes)", () => {
  // "no more texts" contains the standalone per se word "no" — classified per se,
  // which is defensible. What matters legally is that it revokes.
  const r = detectRevocation("no more texts");
  assert.equal(r.revoked, true);
  assert.ok(["per_se_keyword", "reasonable_person"].includes(r.basis));
});

test("Spanish revocations are honored — the test is what a reasonable person conveyed, not the language", () => {
  for (const p of ["ALTO", "cancelar", "basta", "déjame en paz", "no me llamen", "ya tengo abogado"]) {
    assert.equal(detectRevocation(p).revoked, true, `"${p}" must revoke`);
  }
});

test("the verbatim text and basis survive, because the reasonable-person test is applied to the words", () => {
  const r = detectRevocation("Please take me off your list, I have an attorney now");
  assert.equal(r.revoked, true);
  assert.equal(r.verbatim, "Please take me off your list, I have an attorney now");
  assert.ok(r.basis); // a boolean alone cannot be defended three years later
});

test("ordinary replies do NOT revoke (a false positive costs a case, not just a text)", () => {
  for (const p of ["I'm stopping by tomorrow", "yes please call me", "sounds good", "what time?"]) {
    assert.equal(detectRevocation(p).revoked, false, `"${p}" must not revoke`);
  }
});

test("detectOptOut stays a boolean for existing callers", () => {
  assert.equal(detectOptOut("stop"), true);
  assert.equal(detectOptOut("leave me alone"), true);
  assert.equal(detectOptOut("sounds good"), false);
  assert.equal(detectOptOut(null), false);
});
