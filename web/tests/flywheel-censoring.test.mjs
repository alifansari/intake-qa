// Tests for Increment 0 flywheel PURE logic (src/lib/flywheel/censoring.mjs):
// the censoring rules (blank -> null NEVER 0; open cases right-censored;
// bands stored as bands), the version/audit increment, and the immutable
// intake_feature_snapshot. No I/O — pure functions only.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMoney,
  normalizeEndState,
  normalizeImportedRow,
  applyCaseOutcomePatch,
  applyCaseDisposition,
  RESOLUTION_FIELDS,
} from "../src/lib/flywheel/censoring.mjs";

const T0 = "2026-07-10T12:00:00.000Z";
const T1 = "2026-08-15T12:00:00.000Z";
const CTX = { callId: "call-1", firmId: "firm-1", enteredBy: "attorney", now: T0 };

// ---------------------------------------------------------------------------
// Rule 1 — blank means unknown, never zero.
// ---------------------------------------------------------------------------

test("blank / placeholder money values are censored to null, never 0", () => {
  for (const blank of ["", "  ", "-", "n/a", "N/A", "none", "unknown", "TBD", "pending", null, undefined]) {
    assert.equal(normalizeMoney(blank), null, `expected null for ${JSON.stringify(blank)}`);
  }
});

test("an explicit zero the firm typed is a real value and stays 0", () => {
  assert.equal(normalizeMoney("0"), 0);
  assert.equal(normalizeMoney(0), 0);
  assert.equal(normalizeMoney("$0"), 0);
});

test("point values parse: currency symbols, commas, k/m suffixes", () => {
  assert.equal(normalizeMoney("$12,500"), 12500);
  assert.equal(normalizeMoney("12500.50"), 12500.5);
  assert.equal(normalizeMoney("10k"), 10_000);
  assert.equal(normalizeMoney("1.2m"), 1_200_000);
  assert.equal(normalizeMoney(8500), 8500);
});

test("unparseable garbage is censored, never guessed", () => {
  assert.equal(normalizeMoney("call the office"), null);
  assert.equal(normalizeMoney("$$$"), null);
  assert.equal(normalizeMoney(NaN), null);
});

// ---------------------------------------------------------------------------
// Rule 3 — banded values stay bands.
// ---------------------------------------------------------------------------

test("a reported range is stored as a band, not collapsed to a point", () => {
  const band = normalizeMoney("$10k - $25k");
  assert.deepEqual(band, { kind: "band", low: 10_000, high: 25_000, raw: "$10k - $25k" });
});

test("band forms: en-dash, 'to', plain numbers; re-imported bands survive", () => {
  assert.equal(normalizeMoney("10,000 – 25,000").kind, "band");
  assert.equal(normalizeMoney("10k to 25k").kind, "band");
  const reimported = normalizeMoney({ kind: "band", low: 5, high: 9, raw: "5-9" });
  assert.deepEqual(reimported, { kind: "band", low: 5, high: 9, raw: "5-9" });
});

test("an inverted or half-parseable range is not silently accepted as a band", () => {
  assert.equal(normalizeMoney("25k-10k"), null); // high < low → not a valid band
  assert.equal(normalizeMoney("10k-banana"), null);
});

// ---------------------------------------------------------------------------
// Rule 2 — open cases are right-censored.
// ---------------------------------------------------------------------------

test("unknown or blank end_state normalizes to open (right-censored)", () => {
  assert.equal(normalizeEndState(""), "open");
  assert.equal(normalizeEndState(undefined), "open");
  assert.equal(normalizeEndState("in progress"), "open");
  assert.equal(normalizeEndState("Settled"), "settled");
  assert.equal(normalizeEndState("referred resolved"), "referred_resolved");
});

test("an open row right-censors resolution figures even if numbers sneak in", () => {
  const patch = normalizeImportedRow({
    end_state: "open",
    gross: "50000", // premature — must be censored
    net_fee_to_firm: "12000",
    time_to_resolution_days: "90",
    demand_sent_at: "2026-06-01",
    demand_amount: "$85,000",
    first_offer: "40k",
  });
  for (const field of RESOLUTION_FIELDS) assert.equal(patch[field], null, field);
  assert.equal(patch.time_to_resolution_days, null);
  // Demand milestones legitimately precede resolution — they survive.
  assert.equal(patch.demand_sent_at, "2026-06-01T00:00:00.000Z");
  assert.equal(patch.demand_amount, 85_000);
  assert.equal(patch.first_offer, 40_000);
});

test("a settled row keeps its reported values; blanks stay null", () => {
  const patch = normalizeImportedRow({
    end_state: "settled",
    gross: "$100,000",
    costs_advanced: "",       // blank → censored
    lien_load: "n/a",         // censored
    net_to_client: "55k",
    net_fee_to_firm: "33,333",
    referral_fee: "0",        // explicit zero stays zero
    time_to_resolution_days: "412",
  });
  assert.equal(patch.gross, 100_000);
  assert.equal(patch.costs_advanced, null);
  assert.equal(patch.lien_load, null);
  assert.equal(patch.net_to_client, 55_000);
  assert.equal(patch.net_fee_to_firm, 33_333);
  assert.equal(patch.referral_fee, 0);
  assert.equal(patch.time_to_resolution_days, 412);
});

// ---------------------------------------------------------------------------
// Version / audit increment (the existing Outcome discipline).
// ---------------------------------------------------------------------------

test("first write: version 1, empty edits, created stamped", () => {
  const rec = applyCaseOutcomePatch(null, { end_state: "open" }, CTX);
  assert.equal(rec.outcome_version, 1);
  assert.deepEqual(rec.edits, []);
  assert.equal(rec.call_id, "call-1");
  assert.equal(rec.firm_id, "firm-1");
  assert.equal(rec.created_at, T0);
  assert.equal(rec.gross, null); // born censored, not $0
});

test("second write bumps version and appends the prior snapshot to edits", () => {
  const v1 = applyCaseOutcomePatch(null, { end_state: "open" }, CTX);
  const v2 = applyCaseOutcomePatch(
    v1,
    { end_state: "settled", gross: 100_000, net_fee_to_firm: 33_333 },
    { ...CTX, enteredBy: "office_manager", now: T1 }
  );
  assert.equal(v2.outcome_version, 2);
  assert.equal(v2.edits.length, 1);
  assert.equal(v2.edits[0].end_state, "open");
  assert.equal(v2.edits[0].outcome_version, 1);
  assert.equal(v2.edits[0].entered_by, "attorney");
  assert.equal(v2.entered_by, "office_manager");
  assert.equal(v2.updated_at, T1);
  assert.equal(v2.created_at, T0); // creation stamp survives edits
  assert.equal(v2.gross, 100_000);
});

test("a field absent from the patch keeps its prior value; present-null censors it", () => {
  const v1 = applyCaseOutcomePatch(
    null,
    { end_state: "settled", gross: 100_000, net_fee_to_firm: 33_333 },
    CTX
  );
  const v2 = applyCaseOutcomePatch(v1, { net_fee_to_firm: null }, { ...CTX, now: T1 });
  assert.equal(v2.gross, 100_000);        // untouched
  assert.equal(v2.net_fee_to_firm, null); // explicitly re-censored
});

test("reopening a case re-censors resolution figures regardless of patch order", () => {
  const settled = applyCaseOutcomePatch(
    null,
    { end_state: "settled", gross: 100_000, time_to_resolution_days: 300 },
    CTX
  );
  const reopened = applyCaseOutcomePatch(settled, { end_state: "open" }, { ...CTX, now: T1 });
  assert.equal(reopened.gross, null);
  assert.equal(reopened.time_to_resolution_days, null);
  // ...but the audit trail still remembers the settled snapshot.
  assert.equal(reopened.edits[0].gross, 100_000);
});

// ---------------------------------------------------------------------------
// Disposition: immutable intake_feature_snapshot.
// ---------------------------------------------------------------------------

test("the intake_feature_snapshot is written once and never overwritten", () => {
  const first = applyCaseDisposition(
    null,
    {
      disposition: "developing",
      decided_by: "intake_manager",
      intake_feature_snapshot: { incident_date: "asked_answered", um_uim: "not_asked" },
    },
    CTX
  );
  const second = applyCaseDisposition(
    first,
    {
      disposition: "signed",
      decided_by: "attorney",
      intake_feature_snapshot: { incident_date: "REWRITTEN", um_uim: "REWRITTEN" },
    },
    { ...CTX, now: T1 }
  );
  assert.equal(second.disposition, "signed"); // disposition may evolve
  assert.deepEqual(second.intake_feature_snapshot, {
    incident_date: "asked_answered",
    um_uim: "not_asked",
  }); // snapshot frozen at decision time
  assert.equal(second.created_at, T0);
});

test("an empty first snapshot does not lock out the real decision-time write", () => {
  const bare = applyCaseDisposition(
    null,
    { disposition: "developing", decided_by: "intake_manager" },
    CTX
  );
  assert.deepEqual(bare.intake_feature_snapshot, {});
  const stamped = applyCaseDisposition(
    bare,
    {
      disposition: "developing",
      decided_by: "intake_manager",
      intake_feature_snapshot: { incident_date: "asked_answered" },
    },
    { ...CTX, now: T1 }
  );
  assert.deepEqual(stamped.intake_feature_snapshot, { incident_date: "asked_answered" });
});

test("disposition fields: flag_id/external_case_ref persist; bad code degrades safely", () => {
  const first = applyCaseDisposition(
    null,
    {
      disposition: "referred_out",
      decided_by: "attorney",
      flag_id: "flag-9",
      external_case_ref: "FV-12345",
    },
    CTX
  );
  assert.equal(first.flag_id, "flag-9");
  assert.equal(first.external_case_ref, "FV-12345");
  const second = applyCaseDisposition(
    first,
    { disposition: "not-a-real-code", decided_by: "attorney" },
    { ...CTX, now: T1 }
  );
  assert.equal(second.disposition, "no_action"); // never invents a state
  assert.equal(second.flag_id, "flag-9");        // carried forward
  assert.equal(second.external_case_ref, "FV-12345");
});
