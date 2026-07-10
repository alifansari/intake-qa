// Tests for the Ledger compose (Phase 6): firm-fee-only dollars, misses on
// the receipt, product/firm separation, drillability, catastrophic log.

import { test } from "node:test";
import assert from "node:assert/strict";

import { composeLedger, DEFAULT_MINUTES_PER_INTAKE } from "../src/lib/ledger/compose.mjs";

const LEADS = [
  { id: "l1", bucket: "book", status: "complete", contact: { first_name: "A", phone: "1" } },
  { id: "l2", bucket: "escalate", status: "complete", contact: { first_name: "B", phone: "2" } },
  { id: "l3", bucket: null, status: "in_progress", contact: { first_name: "C", phone: "3" } }, // abandoned, captured
  { id: "l4", bucket: "decline", status: "complete", contact: { first_name: "D", phone: "4" } },
  { id: "l5", bucket: null, status: "in_progress", contact: {} }, // abandoned, NOT captured
];

const ESCALATIONS = [
  { id: "e1", lead_id: "l2", trigger_key: "gov_claims_notice", tier: "hot", status: "acked",
    fired_at: "2026-07-01T10:00:00Z", acked_at: "2026-07-01T10:08:00Z" },
  { id: "e2", lead_id: "l2", trigger_key: "evidence_decay", tier: "warm", status: "unclaimed",
    fired_at: "2026-07-02T10:00:00Z", acked_at: null },
];

test("no firm fee → no dollar lines at all; counts still present", () => {
  const led = composeLedger({ period: "2026-07", leads: LEADS, escalations: [], dispositions: [], proposals: [] });
  assert.equal(led.dollars, null);
  assert.equal(led.product.captured, 4, "contactless rows don't count as captured");
  assert.equal(led.product.caught, 2, "book + escalate only");
});

test("firm fee produces caught_leads_value = caught × THEIR fee, inputs stated", () => {
  const led = composeLedger({
    period: "2026-07", leads: LEADS, escalations: [], dispositions: [], proposals: [],
    settings: { average_case_fee: 12000 },
  });
  assert.equal(led.dollars.caught_leads_value, 24000);
  assert.match(led.dollars.inputs_note, /your stated average case fee/);
});

test("SLA includes the misses: unclaimed count + drillable ids", () => {
  const led = composeLedger({ period: "2026-07", leads: LEADS, escalations: ESCALATIONS, dispositions: [], proposals: [] });
  assert.equal(led.sla.fired, 2);
  assert.equal(led.sla.acked, 1);
  assert.equal(led.sla.median_ack_minutes, 8);
  assert.equal(led.sla.unclaimed, 1);
  assert.deepEqual(led.sla.unclaimed_ids, ["e2"]);
});

test("catastrophic log lists hot escalations with their trigger", () => {
  const led = composeLedger({ period: "2026-07", leads: [], escalations: ESCALATIONS, dispositions: [], proposals: [] });
  assert.equal(led.catastrophic.length, 1);
  assert.equal(led.catastrophic[0].trigger, "gov_claims_notice");
});

test("firm column is manual-dispositions-sourced until CRM read-back exists", () => {
  const led = composeLedger({
    period: "2026-07", leads: LEADS, escalations: ESCALATIONS,
    dispositions: [
      { escalation_id: "e1", disposition: "true_positive", converted: true },
      { escalation_id: "e2", disposition: "true_positive", converted: false },
    ],
    proposals: [],
  });
  assert.equal(led.firm.source, "manual_dispositions");
  assert.equal(led.firm.converted, 1);
  assert.deepEqual(led.firm.converted_escalation_ids, ["e1"]);
});

test("every headline number carries drillable ids", () => {
  const led = composeLedger({ period: "2026-07", leads: LEADS, escalations: ESCALATIONS, dispositions: [], proposals: [] });
  assert.deepEqual(led.product.caught_ids.sort(), ["l1", "l2"]);
  assert.deepEqual(led.product.abandoned_ids, ["l3"]);
  assert.deepEqual(led.product.bucket_ids.decline, ["l4"]);
});

test("time saved uses the per-intake default", () => {
  const led = composeLedger({ period: "2026-07", leads: LEADS, escalations: [], dispositions: [], proposals: [] });
  assert.equal(led.time_saved_minutes, 4 * DEFAULT_MINUTES_PER_INTAKE);
});

test("tuning summary counts by status", () => {
  const led = composeLedger({
    period: "2026-07", leads: [], escalations: [], dispositions: [],
    proposals: [{ status: "proposed" }, { status: "approved" }, { status: "approved" }, { status: "rejected" }],
  });
  assert.deepEqual(led.tuning, { proposed: 1, approved: 2, rejected: 1 });
});
