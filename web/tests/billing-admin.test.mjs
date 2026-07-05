// Tests for the operator billing-action validator (logic behind
// /api/admin/billing). Covers malformed input and per-action required fields.

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBillingAction } from "../admin/billing-admin.mjs";

test("rejects a non-object body and unknown actions", () => {
  assert.equal(validateBillingAction(null).ok, false);
  assert.equal(validateBillingAction({ action: "nope" }).ok, false);
  assert.equal(validateBillingAction({ action: "nope" }).status, 422);
});

test("close_period requires firm_id and a YYYY-MM period", () => {
  assert.equal(validateBillingAction({ action: "close_period", firm_id: 1 }).ok, false);
  assert.equal(
    validateBillingAction({ action: "close_period", firm_id: 1, period: "2026-6" }).ok,
    false,
  );
  assert.equal(
    validateBillingAction({ action: "close_period", firm_id: 1, period: "2026-06" }).ok,
    true,
  );
});

test("event/invoice actions require their id", () => {
  assert.equal(validateBillingAction({ action: "dispute_event" }).ok, false);
  assert.equal(validateBillingAction({ action: "dispute_event", event_id: 5 }).ok, true);
  assert.equal(validateBillingAction({ action: "void_invoice" }).ok, false);
  assert.equal(validateBillingAction({ action: "void_invoice", invoice_id: 9 }).ok, true);
});
