// P0-2: a ConsentEvent can be written through the store before any mic workflow.
// P1(b): E.164 normalization rejects garbage and canonicalizes US numbers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import { createConsentEvent } from "../ingest/store.mjs";
import { normalizeE164 } from "../ingest/callrail.mjs";

test("createConsentEvent writes a firm-scoped consent record", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-consent-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const firmId = Number(
    db.prepare(`INSERT INTO firms (name, kill_switch) VALUES ('Firm', 1)`).run().lastInsertRowid,
  );
  const id = await createConsentEvent(db, {
    firm_id: firmId,
    basis: "live_coach_recording_analysis_CIPA_632",
    detail: "All parties consented under CA Penal Code §632",
    actor: "desk_operator",
  });
  assert.ok(id, "returns an id");
  const row = db.prepare("SELECT * FROM consent_events WHERE id = ?").get(id);
  assert.equal(row.firm_id, firmId);
  assert.equal(row.basis, "live_coach_recording_analysis_CIPA_632");
  assert.ok(row.detail.includes("§632"));
});

test("normalizeE164 canonicalizes US numbers and rejects junk", () => {
  assert.equal(normalizeE164("5105550123"), "+15105550123", "10-digit -> +1");
  assert.equal(normalizeE164("(510) 555-0123"), "+15105550123", "formatted -> +1");
  assert.equal(normalizeE164("15105550123"), "+15105550123", "11-digit leading 1");
  assert.equal(normalizeE164("+15105550123"), "+15105550123", "already E.164");
  assert.equal(normalizeE164("+442071838750"), "+442071838750", "intl +… preserved");
  assert.equal(normalizeE164("123"), null, "too short -> null");
  assert.equal(normalizeE164("not-a-phone"), null, "garbage -> null");
  assert.equal(normalizeE164(""), null, "empty -> null");
  assert.equal(normalizeE164(null), null, "null -> null");
});
