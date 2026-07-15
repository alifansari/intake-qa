// Stage 2a: marketing attribution capture (source -> signable value foundation).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { createFirm } from "../ingest/db.mjs";
import { upsertCall } from "../ingest/store.mjs";
import { parseCallRailPayload } from "../ingest/callrail.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-attribution-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

test("parseCallRailPayload keeps the attribution CallRail sends (no longer discarded)", () => {
  const fields = parseCallRailPayload({
    id: "CAL123",
    customer_phone_number: "+13105550123",
    source_name: "Google Ads",
    campaign: "PI - Car Accident",
    utm_source: "google",
    utm_medium: "cpc",
    utm_term: "car accident lawyer",
    keywords: "car accident lawyer",
    gclid: "abc123",
    tracking_phone_number: "+18005551212",
    landing_page_url: "https://firm.com/car-accident-lawyer",
  });
  assert.equal(fields.lead_source, "Google Ads");
  assert.equal(fields.lead_campaign, "PI - Car Accident");
  const attr = JSON.parse(fields.attribution_json);
  assert.equal(attr.utm_medium, "cpc");
  assert.equal(attr.gclid, "abc123");
  assert.equal(attr.keywords, "car accident lawyer");
});

test("a payload with no attribution yields null fields (no empty blob persisted)", () => {
  const fields = parseCallRailPayload({ id: "CAL999", customer_phone_number: "+13105550123" });
  assert.equal(fields.lead_source, null);
  assert.equal(fields.lead_campaign, null);
  assert.equal(fields.attribution_json, null);
});

test("upsertCall persists and reads back the attribution columns", async (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Attribution Firm", avg_case_fee: 9000 });
  const { id } = await upsertCall(db, {
    firm_id: firmId,
    source: "callrail",
    external_call_id: "CAL-ATTR-1",
    received_at: "2026-07-14T10:00:00Z",
    lead_source: "Google Ads",
    lead_campaign: "PI - Car Accident",
    attribution_json: JSON.stringify({ utm_medium: "cpc", gclid: "abc123" }),
  });
  const row = db.prepare("SELECT lead_source, lead_campaign, attribution_json FROM calls WHERE id = ?").get(id);
  assert.equal(row.lead_source, "Google Ads");
  assert.equal(row.lead_campaign, "PI - Car Accident");
  assert.equal(JSON.parse(row.attribution_json).utm_medium, "cpc");

  // A later modified-call webhook with no attribution must not wipe it (COALESCE).
  await upsertCall(db, {
    firm_id: firmId,
    source: "callrail",
    external_call_id: "CAL-ATTR-1",
    received_at: "2026-07-14T10:05:00Z",
  });
  const row2 = db.prepare("SELECT lead_source FROM calls WHERE id = ?").get(id);
  assert.equal(row2.lead_source, "Google Ads");
});
