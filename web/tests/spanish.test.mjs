// Tests for Spanish-language intake support (Phase 4): Spanish opt-out keyword
// detection and bilingual draft validation (a Spanish first message must carry
// BOTH the Spanish ALTO opt-out and the English STOP keyword Twilio honors).

import { test } from "node:test";
import assert from "node:assert/strict";

import { detectOptOut } from "../messaging/compliance.mjs";
import {
  validateDraft,
  draftFirstMessage,
  OPT_OUT_TEXT,
  OPT_OUT_TEXT_ES,
} from "../messaging/draft.mjs";

test("detectOptOut recognizes Spanish keywords", () => {
  for (const kw of ["ALTO", "alto", "Cancelar", "PARAR", "no"]) {
    assert.equal(detectOptOut(kw), true, `${kw} should opt out`);
  }
  assert.equal(detectOptOut("no gracias"), true); // standalone "no"
  // Ordinary Spanish that contains none of the standalone keywords doesn't trip.
  assert.equal(detectOptOut("hola, quiero hablar con un abogado"), false);
});

test("English keywords still work after adding Spanish", () => {
  assert.equal(detectOptOut("STOP"), true);
  assert.equal(detectOptOut("please unsubscribe me"), true);
  assert.equal(detectOptOut("stopping by later"), false);
});

test("validateDraft: a Spanish first message needs BOTH ALTO and STOP", () => {
  const withBoth = `Hola de parte de Smith Law. ${OPT_OUT_TEXT_ES} ${OPT_OUT_TEXT}`;
  assert.deepEqual(validateDraft(withBoth, { firstMessage: true, language: "es" }), []);

  const spanishOnly = `Hola de parte de Smith Law. ${OPT_OUT_TEXT_ES}`;
  const errs = validateDraft(spanishOnly, { firstMessage: true, language: "es" });
  assert.ok(errs.some((e) => /STOP/.test(e)), "must flag missing English STOP");

  const englishOnly = `Hola de parte de Smith Law. ${OPT_OUT_TEXT}`;
  const errs2 = validateDraft(englishOnly, { firstMessage: true, language: "es" });
  assert.ok(errs2.some((e) => /ALTO/.test(e)), "must flag missing Spanish ALTO");
});

test("validateDraft: an English first message only needs STOP", () => {
  assert.deepEqual(
    validateDraft(`Hi from Smith Law. ${OPT_OUT_TEXT}`, { firstMessage: true, language: "en" }),
    [],
  );
});

test("draftFirstMessage(es): a compliant Spanish draft passes; a non-compliant one is refused", async () => {
  const template = { body: "Hola {{first_name}}, soy de {{firm_name}}." };

  const good = await draftFirstMessage({
    template,
    firmName: "Smith Law",
    callerName: "Maria",
    language: "es",
    drafter: async () =>
      `Hola Maria, soy de Smith Law. ${OPT_OUT_TEXT_ES} ${OPT_OUT_TEXT}`,
  });
  assert.match(good, /ALTO/);
  assert.match(good, /STOP/);

  // A drafter that never includes the English STOP is rejected after the retry.
  await assert.rejects(
    draftFirstMessage({
      template,
      firmName: "Smith Law",
      callerName: "Maria",
      language: "es",
      drafter: async () => `Hola Maria, soy de Smith Law. ${OPT_OUT_TEXT_ES}`,
    }),
    /constraints not met/,
  );
});
