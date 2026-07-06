// Unit tests for the AssemblyAI transcription-request assembly, especially the
// conservative PII-redaction policy. Imports the dependency-free config module
// (no assemblyai SDK, no network, no API key). Guards the invariant that matters:
// redaction touches ONLY identity/financial/gov-ID entities, never the person
// name / phone / injury / medical signal the scorer + recovery workflow rely on.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTranscribeParams,
  redactionEnabled,
  DEFAULT_PII_POLICIES,
} from "../../lib/transcribe-config.js";

test("diarization + language detection are always on", () => {
  const p = buildTranscribeParams("/tmp/a.mp3", { redact: false });
  assert.equal(p.audio, "/tmp/a.mp3");
  assert.equal(p.speaker_labels, true);
  assert.equal(p.language_detection, true);
  // With redaction off, no redaction keys are sent at all.
  assert.equal(p.redact_pii, undefined);
  assert.equal(p.redact_pii_policies, undefined);
});

test("redaction on: only conservative policies, readable substitution", () => {
  const p = buildTranscribeParams("/tmp/a.mp3", { redact: true });
  assert.equal(p.redact_pii, true);
  assert.equal(p.redact_pii_sub, "entity_name");
  assert.deepEqual(p.redact_pii_policies, DEFAULT_PII_POLICIES);
});

test("we NEVER redact re-contact info or case signal", () => {
  // These would break the product (re-contact) or shift the frozen scorer.
  const forbidden = [
    "person_name",
    "phone_number",
    "injury",
    "medical_condition",
    "medical_process",
    "location",
    "date",
    "date_of_birth",
    "email_address",
    "occupation",
    "organization",
  ];
  for (const entity of forbidden) {
    assert.ok(
      !DEFAULT_PII_POLICIES.includes(entity),
      `${entity} must NOT be redacted (needed for re-contact or scoring)`,
    );
  }
});

test("we DO redact pure identity/financial/gov-ID risk", () => {
  for (const entity of [
    "us_social_security_number",
    "credit_card_number",
    "banking_information",
    "drivers_license",
    "passport_number",
  ]) {
    assert.ok(DEFAULT_PII_POLICIES.includes(entity), `${entity} should be redacted`);
  }
});

test("redactionEnabled defaults ON and honors the off switch", () => {
  assert.equal(redactionEnabled({}), true); // unset -> on
  assert.equal(redactionEnabled({ ASSEMBLYAI_REDACT_PII: "true" }), true);
  assert.equal(redactionEnabled({ ASSEMBLYAI_REDACT_PII: "false" }), false);
  assert.equal(redactionEnabled({ ASSEMBLYAI_REDACT_PII: "FALSE" }), false);
});

test("empty policy list disables redaction even when redact=true", () => {
  const p = buildTranscribeParams("/tmp/a.mp3", { redact: true, policies: [] });
  assert.equal(p.redact_pii, undefined);
});
