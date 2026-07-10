// Tests for the CRM handoff contract (Phase 7): mappers (native fields, enum
// normalization, graceful degradation, consent travels, least-data), the
// mock connector, and the create-only port shape.

import { test } from "node:test";
import assert from "node:assert/strict";

import { mapRecord, DEFAULT_FIELD_MAPS, PROVIDERS } from "../src/lib/crm/mappers.mjs";
import { createMockCrm } from "../src/lib/crm/mock.mjs";

const RECORD = {
  matter_type: "mva",
  bucket: "book",
  confidence: 0.85,
  contact: { first_name: "Maria", phone: "916-555-0122" },
  incident: { date: "2026-06-01", narrative: "Rear-ended at a light." },
  path_data: { fault: "other", injured: "treated", treatment: "er", photos: [{ filename: "a.jpg" }] },
  routing: { reasons: ["fault_other_driver", "injured_treated"] },
  provenance: { session_id: "secret-session", node_history: ["a", "b"] },
  events: [{ seq: 0, kind: "question" }],
  consent_version: "intake-disclosure-v1-2026-07",
  consent_at: "2026-07-09T18:00:00Z",
};

test("every provider has a default field map and enum table", () => {
  for (const p of PROVIDERS) {
    assert.ok(DEFAULT_FIELD_MAPS[p], p);
    const mapped = mapRecord(RECORD, p);
    assert.ok(Object.keys(mapped.fields).length >= 5, `${p} maps native fields`);
  }
});

test("native fields over notes: mapped values land in provider fields", () => {
  const m = mapRecord(RECORD, "leaddocket");
  assert.equal(m.fields.FirstName, "Maria");
  assert.equal(m.fields.Phone, "916-555-0122");
  assert.equal(m.fields.CaseType, "Auto Accident", "enum normalized per CRM");
  assert.equal(m.fields.IntakeDisposition, "book");
});

test("enum normalization differs per provider; unknown matter degrades", () => {
  assert.equal(mapRecord(RECORD, "filevine").fields.projectTypeName, "Motor Vehicle Collision");
  assert.equal(mapRecord(RECORD, "litify").fields["litify_pm__Case_Type__c"], "litify_pm__Auto");
  const odd = mapRecord({ ...RECORD, matter_type: "unknown" }, "leaddocket");
  assert.equal(odd.fields.CaseType, "Unknown");
});

test("unmapped path_data degrades into ONE labeled AI-captured notes block", () => {
  const m = mapRecord(RECORD, "mock");
  assert.match(m.notes, /^\[AI-captured intake — unverified until reviewed\]/);
  assert.match(m.notes, /fault: other/);
  assert.match(m.notes, /photos attached: 1/);
  assert.ok(m.unmapped_keys.includes("fault"));
  assert.ok(m.review_required, "AI-captured stays visually distinct until verified");
});

test("least data necessary: events, provenance internals never leave", () => {
  const m = mapRecord(RECORD, "mock");
  const flat = JSON.stringify(m);
  assert.ok(!flat.includes("secret-session"), "provenance session id does not travel");
  assert.ok(!flat.includes("node_history"));
  assert.ok(!flat.includes('"events"'));
});

test("the consent flag travels with every payload", () => {
  for (const p of PROVIDERS) {
    const m = mapRecord(RECORD, p);
    assert.equal(m.consent.version, "intake-disclosure-v1-2026-07");
    assert.equal(m.consent.at, "2026-07-09T18:00:00Z");
  }
});

test("firm field_map overrides defaults key-by-key", () => {
  const m = mapRecord(RECORD, "leaddocket", { "contact.phone": "MobilePhone" });
  assert.equal(m.fields.MobilePhone, "916-555-0122");
  assert.equal(m.fields.FirstName, "Maria", "non-overridden keys keep defaults");
});

test("the port is create-only: no update or merge method exists", () => {
  const crm = createMockCrm();
  assert.equal(typeof crm.createLead, "function");
  assert.equal(typeof crm.findPossibleDuplicates, "function");
  assert.equal(typeof crm.readConversions, "function");
  for (const forbidden of ["updateLead", "mergeLead", "upsertLead", "deleteLead", "editMatter"]) {
    assert.equal(crm[forbidden], undefined, `${forbidden} must not exist`);
  }
});

test("mock connector: create, duplicate flagging by phone, conversions read-back", async () => {
  const crm = createMockCrm();
  const payload = mapRecord(RECORD, "mock");
  const first = await crm.createLead(payload);
  assert.ok(first.ok);
  const dups = await crm.findPossibleDuplicates(payload);
  assert.equal(dups.length, 1, "same phone flags a probable duplicate");
  assert.equal(dups[0].reason, "same_phone");
  crm.markConverted(first.external_id, "2026-07-15T00:00:00Z");
  const conv = await crm.readConversions("2026-07-01T00:00:00Z");
  assert.equal(conv.length, 1);
  assert.equal(conv[0].external_id, first.external_id);
});

test("mock connector: transient failures are retryable", async () => {
  const crm = createMockCrm();
  crm.failNextCreates(1);
  const fail = await crm.createLead(mapRecord(RECORD, "mock"));
  assert.equal(fail.ok, false);
  assert.equal(fail.retryable, true);
  const ok = await crm.createLead(mapRecord(RECORD, "mock"));
  assert.ok(ok.ok);
});
