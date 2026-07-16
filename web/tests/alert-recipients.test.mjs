// Per-firm alert recipients — the resolver behind the missed-call pager and digest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseAlertRecipients,
  resolveAlertRecipients,
  serializeAlertRecipients,
  MAX_ALERT_RECIPIENTS,
} from "../messaging/alert-recipients.mjs";
import { openMigratedDb } from "../db/connection.mjs";
import { createFirm, setFirmAlertEmails, getFirm } from "../ingest/db.mjs";

test("parses what a human actually types: commas, semicolons, spaces, mixed case", () => {
  assert.deepEqual(
    parseAlertRecipients("Intake@Firm.com, oncall@firm.com;  night@firm.com"),
    ["intake@firm.com", "oncall@firm.com", "night@firm.com"],
  );
});

test("drops garbage and de-duplicates instead of hard-failing the mailer", () => {
  assert.deepEqual(
    parseAlertRecipients("good@firm.com, not-an-email, , good@firm.com, @nope, x@y.z"),
    ["good@firm.com", "x@y.z"],
  );
  assert.deepEqual(parseAlertRecipients(null), []);
  assert.deepEqual(parseAlertRecipients(""), []);
});

test("the firm's explicit list wins; unset falls back to login emails", () => {
  assert.deepEqual(
    resolveAlertRecipients({ alertEmails: "intake@firm.com", fallback: ["owner@firm.com"] }),
    ["intake@firm.com"],
  );
  // Unset -> fall back to whoever holds a login (existing behaviour preserved).
  assert.deepEqual(
    resolveAlertRecipients({ alertEmails: null, fallback: ["owner@firm.com"] }),
    ["owner@firm.com"],
  );
  // Both empty -> nobody. The digest's own "no recipients" guard then applies.
  assert.deepEqual(resolveAlertRecipients({}), []);
});

test("a pager everyone gets is a pager nobody answers: the list is capped", () => {
  const many = Array.from({ length: 25 }, (_, i) => `a${i}@firm.com`).join(",");
  assert.equal(resolveAlertRecipients({ alertEmails: many }).length, MAX_ALERT_RECIPIENTS);
});

test("serialize stores a canonical list, or null when nothing valid was given", () => {
  assert.equal(serializeAlertRecipients("A@b.com,  a@b.com "), "a@b.com");
  assert.equal(serializeAlertRecipients("nonsense"), null);
  assert.equal(serializeAlertRecipients(""), null);
});

test("alert_emails round-trips on the firm row", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-alertrec-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

  const firmId = createFirm(db, { name: "Pager Firm", avg_case_fee: 9000 });
  assert.equal(setFirmAlertEmails(db, firmId, "intake@firm.com, oncall@firm.com"), true);
  const firm = getFirm(db, firmId);
  assert.equal(firm.alert_emails, "intake@firm.com, oncall@firm.com");
  assert.deepEqual(
    resolveAlertRecipients({ alertEmails: firm.alert_emails, fallback: [] }),
    ["intake@firm.com", "oncall@firm.com"],
  );
  // Clearing falls the firm back to member emails.
  setFirmAlertEmails(db, firmId, null);
  assert.equal(getFirm(db, firmId).alert_emails, null);
});
