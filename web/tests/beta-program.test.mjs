// Beta program layer (modules 0a/0b/0c + consent gate). Load-bearing guarantees:
//   * ICP gate — only California PI firms qualify; everyone else is WAITLISTED
//     with a practice-area tag, never admitted.
//   * NDA HARD GATE (invariant f) — no data access in any pre-NDA state; the
//     state machine has no edge that skips nda_signed.
//   * Feedback is per-artifact and validated; aggregation produces the four
//     learning signals (UX / utility / trust / WTP).
//   * Consent gate (invariant c) — a no-consent call is never analyzable; an
//     unknown-consent call is analyzable only under a firm attestation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  qualify,
  validateApplication,
  applyToBeta,
  advanceApplicant,
  canTransition,
} from "../beta/applicants.mjs";
import {
  sendNdaRequest,
  completeNdaSignature,
  hasSignedNda,
  assertBetaDataAccess,
} from "../beta/nda.mjs";
import { recordFeedback, aggregateFeedback, validateFeedback } from "../beta/feedback.mjs";
import { getBetaApplicant, listWaitlist, listBetaFeedback } from "../beta/store.mjs";
import { isAnalyzable, filterAnalyzable } from "../beta/consent-gate.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-beta-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

const CA_PI_APPLICATION = {
  email: "owner@example-law.com",
  name: "Dana Owner",
  firm_name: "Example Injury Law",
  role: "owner",
  practice_area: "personal_injury",
  state: "CA",
  monthly_call_volume: 120,
  records_calls: true,
  spanish_call_pct: 30,
};

// --- Qualification gate --------------------------------------------------------

test("qualify: California PI firm passes the ICP gate", () => {
  const q = qualify(CA_PI_APPLICATION);
  assert.equal(q.qualified, true);
  assert.equal(q.waitlist_tag, null);
});

test("qualify: non-California firm is not admitted", () => {
  const q = qualify({ ...CA_PI_APPLICATION, state: "TX" });
  assert.equal(q.qualified, false);
  assert.ok(q.reasons.some((r) => r.startsWith("outside_california")));
});

test("qualify: non-PI practice area is not admitted and carries its tag", () => {
  const q = qualify({ ...CA_PI_APPLICATION, practice_area: "employment" });
  assert.equal(q.qualified, false);
  assert.equal(q.waitlist_tag, "employment");
});

test("qualify: volume outside the band and not-recording are soft signals, not gates", () => {
  const q = qualify({ ...CA_PI_APPLICATION, monthly_call_volume: 5, records_calls: false });
  assert.equal(q.qualified, true);
  assert.ok(q.reasons.includes("volume_below_band"));
  assert.ok(q.reasons.includes("not_recording_yet"));
});

// Truthfulness of the recording signal: the apply form asks yes / no / not
// sure. Only an actual "no" may be recorded as not_recording_yet; silence or
// "not sure" is recorded as unknown — never claimed as a finding.
test("qualify: recording answer 'yes' (form) or true adds no recording reason", () => {
  for (const v of [true, "yes"]) {
    const q = qualify({ ...CA_PI_APPLICATION, records_calls: v });
    assert.equal(q.qualified, true);
    assert.ok(!q.reasons.includes("not_recording_yet"), `value ${v}`);
    assert.ok(!q.reasons.includes("recording_status_unknown"), `value ${v}`);
  }
});

test("qualify: recording answer 'no' (form) or false is not_recording_yet", () => {
  for (const v of [false, "no"]) {
    const q = qualify({ ...CA_PI_APPLICATION, records_calls: v });
    assert.equal(q.qualified, true); // soft signal, never a gate
    assert.ok(q.reasons.includes("not_recording_yet"), `value ${v}`);
  }
});

test("qualify: unanswered or 'not sure' recording is unknown, NOT not_recording_yet", () => {
  const unanswered = { ...CA_PI_APPLICATION };
  delete unanswered.records_calls;
  for (const app of [unanswered, { ...CA_PI_APPLICATION, records_calls: "not_sure" }]) {
    const q = qualify(app);
    assert.equal(q.qualified, true);
    assert.ok(!q.reasons.includes("not_recording_yet"));
    assert.ok(q.reasons.includes("recording_status_unknown"));
  }
});

test("validateApplication rejects a malformed records_calls value", () => {
  assert.equal(
    validateApplication({ ...CA_PI_APPLICATION, records_calls: "maybe" }).ok,
    false,
  );
  assert.equal(
    validateApplication({ ...CA_PI_APPLICATION, records_calls: "not_sure" }).ok,
    true,
  );
});

test("applyToBeta: form strings persist as an honest boolean at rest", async (t) => {
  const db = makeDb(t);
  // "no" must never coerce truthy into the boolean column…
  const no = await applyToBeta({
    db,
    application: { ...CA_PI_APPLICATION, email: "no@x.com", records_calls: "no" },
  });
  const noRow = await getBetaApplicant(db, no.applicantId);
  assert.equal(Boolean(noRow.records_calls), false);
  // …and "yes" persists true.
  const yes = await applyToBeta({
    db,
    application: { ...CA_PI_APPLICATION, email: "yes@x.com", records_calls: "yes" },
  });
  const yesRow = await getBetaApplicant(db, yes.applicantId);
  assert.equal(Boolean(yesRow.records_calls), true);
});

test("validateApplication rejects missing/invalid fields", () => {
  assert.equal(validateApplication({}).ok, false);
  assert.equal(validateApplication({ ...CA_PI_APPLICATION, email: "nope" }).ok, false);
  assert.equal(validateApplication(CA_PI_APPLICATION).ok, true);
});

// --- Apply + waitlist ------------------------------------------------------------

test("applyToBeta: qualified applicant lands in nda_pending", async (t) => {
  const db = makeDb(t);
  const res = await applyToBeta({ db, application: CA_PI_APPLICATION });
  assert.equal(res.status, "nda_pending");
  const row = await getBetaApplicant(db, res.applicantId);
  assert.equal(row.status, "nda_pending");
});

test("applyToBeta: non-ICP applicant is waitlisted with a practice-area tag", async (t) => {
  const db = makeDb(t);
  const res = await applyToBeta({
    db,
    application: { ...CA_PI_APPLICATION, practice_area: "immigration" },
  });
  assert.equal(res.status, "waitlisted");
  const wl = await listWaitlist(db, "immigration");
  assert.equal(wl.length, 1);
  assert.equal(wl[0].applicant_id, res.applicantId);
});

// --- State machine + NDA hard gate ------------------------------------------------

test("state machine: no edge skips the NDA", () => {
  assert.equal(canTransition("applied", "onboarding"), false);
  assert.equal(canTransition("nda_pending", "onboarding"), false);
  assert.equal(canTransition("nda_pending", "active_tester"), false);
  assert.equal(canTransition("nda_signed", "onboarding"), true);
});

test("advanceApplicant throws on an illegal transition", async (t) => {
  const db = makeDb(t);
  const { applicantId } = await applyToBeta({ db, application: CA_PI_APPLICATION });
  await assert.rejects(
    advanceApplicant({ db, applicantId, to: "active_tester" }),
    /illegal transition/
  );
});

test("NDA flow: send (simulated) -> webhook completion -> access opens; before that, access throws", async (t) => {
  const db = makeDb(t);
  const { applicantId } = await applyToBeta({ db, application: CA_PI_APPLICATION });

  // Pre-NDA: the chokepoint denies (invariant f).
  await assert.rejects(assertBetaDataAccess(db, applicantId), /beta_access_denied/);

  const sent = await sendNdaRequest({ db, applicantId, env: { TEST_MODE: "true" } });
  assert.equal(sent.simulated, true);
  assert.equal(await hasSignedNda(db, applicantId), false);
  await assert.rejects(assertBetaDataAccess(db, applicantId), /beta_access_denied/);

  const done = await completeNdaSignature({ db, signatureRequestId: sent.signatureRequestId });
  assert.equal(done.handled, true);
  assert.equal(await hasSignedNda(db, applicantId), true);

  const applicant = await assertBetaDataAccess(db, applicantId);
  assert.equal(applicant.status, "nda_signed");

  // Unknown signature ids no-op (the retainer flow shares the webhook).
  const other = await completeNdaSignature({ db, signatureRequestId: "not-ours" });
  assert.equal(other.handled, false);
});

test("sendNdaRequest refuses outside nda_pending", async (t) => {
  const db = makeDb(t);
  const res = await applyToBeta({
    db,
    application: { ...CA_PI_APPLICATION, practice_area: "employment" },
  });
  await assert.rejects(
    sendNdaRequest({ db, applicantId: res.applicantId, env: { TEST_MODE: "true" } }),
    /nda_pending/
  );
});

// --- Structured feedback -----------------------------------------------------------

test("feedback: per-artifact rows validate, persist, and aggregate", async (t) => {
  const db = makeDb(t);
  const { applicantId } = await applyToBeta({ db, application: CA_PI_APPLICATION });

  // Non-general feedback must name its artifact.
  assert.equal(validateFeedback({ subject_type: "audit", applicant_id: applicantId }).ok, false);
  assert.equal(validateFeedback({ subject_type: "audit", subject_id: "tok1", applicant_id: applicantId }).ok, true);

  const bad = await recordFeedback({
    db,
    feedback: { subject_type: "audit", subject_id: "tok1", applicant_id: applicantId, trust_score: 9 },
  });
  assert.ok(bad.errors.includes("invalid:trust_score"));

  await recordFeedback({
    db,
    feedback: {
      subject_type: "audit",
      subject_id: "tok1",
      applicant_id: applicantId,
      ux_report_clarity: 5,
      utility_flags_signable: "yes",
      trust_score: 4,
      wtp_would_pay: "yes",
      wtp_monthly_max_cents: 100000,
      wtp_must_have: "CRM sync",
    },
  });
  await recordFeedback({
    db,
    feedback: {
      subject_type: "rescue_packet",
      subject_id: "packet-1",
      applicant_id: applicantId,
      utility_script_usable: "with_edits",
      trust_false_positives: 1,
      wtp_would_pay: "maybe",
    },
  });

  const rows = await listBetaFeedback(db, {});
  assert.equal(rows.length, 2);
  const agg = aggregateFeedback(rows);
  assert.equal(agg.count, 2);
  assert.equal(agg.bySubjectType.audit, 1);
  assert.equal(agg.bySubjectType.rescue_packet, 1);
  assert.equal(agg.trust.false_positives_total, 1);
  assert.equal(agg.willingnessToPay.would_pay.yes, 1);
  assert.deepEqual(agg.willingnessToPay.must_haves, ["CRM sync"]);
});

// --- Consent gate (invariant c) -----------------------------------------------------

test("consent gate: no_consent is a hard exclusion; unknown requires firm attestation", () => {
  const attested = { consent_attested: 1 };
  assert.equal(isAnalyzable({ call: { consent_status: "no_consent" }, complianceConfig: attested }).analyzable, false);
  assert.equal(isAnalyzable({ call: { consent_status: "consented" }, complianceConfig: null }).analyzable, true);
  assert.equal(isAnalyzable({ call: { consent_status: "unknown" }, complianceConfig: attested }).analyzable, true);
  assert.equal(isAnalyzable({ call: { consent_status: "unknown" }, complianceConfig: null }).analyzable, false);

  const { analyzable, excluded } = filterAnalyzable({
    calls: [
      { id: 1, consent_status: "consented" },
      { id: 2, consent_status: "no_consent" },
      { id: 3, consent_status: "unknown" },
    ],
    complianceConfig: { consent_attested: false },
  });
  assert.deepEqual(analyzable.map((r) => r.call.id), [1]);
  assert.deepEqual(excluded.map((r) => r.call.id), [2, 3]);
});
