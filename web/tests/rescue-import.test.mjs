// CRM dead-lead rescue import (the layer above the cadence). Load-bearing
// guarantees:
//   * SCREEN ONLY ON LEGALLY-DETERMINABLE FACTS — statute run, excluded case
//     type, another firm retained, do-not-contact. Coverage/severity/fault
//     never screen a lead out.
//   * HONEST NULLS — a missing attempt count can never classify as "stopped
//     too early"; missing dates never produce a guessed deadline.
//   * LANGUAGE IS NEVER A MERIT INPUT — a Spanish-language lead's value tier
//     is identical to the same lead in English; language only sets the gap.
//   * VALUE IS A TIER, NEVER DOLLARS — and markers only raise it.
//   * The conveyor is unchanged: imported candidates still need named human
//     review before they can reach a packet (invariant d), and re-importing
//     the same export never duplicates leads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  parseCsv,
  mapHeaders,
  normalizeRow,
  normalizeCaseType,
  parseDateish,
  importDeadLeads,
} from "../rescue/import.mjs";
import {
  triageLead,
  screenLead,
  classifyTriageGap,
  valueTier,
  recoverabilityEstimate,
  TRIAGE_RUBRIC_VERSION,
} from "../rescue/triage.mjs";
import { rescueListToCrmCsv, RESCUE_STATUS_LABEL } from "../rescue/crm-export.mjs";
import { confirmFlag } from "../rescue/review.mjs";
import { buildDailyPacket } from "../rescue/packet.mjs";
import { listReviewItems, listCrmLeads, listImportBatches, getCrmLeadByFlag } from "../beta/store.mjs";

const NOW = new Date("2026-07-11T18:00:00Z");

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-rescue-import-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

function makeFirm(db, avgFee = 10000) {
  return Number(
    db
      .prepare(`INSERT INTO firms (name, avg_case_fee, reengage_window_hours) VALUES ('Test Firm', ?, 72)`)
      .run(avgFee).lastInsertRowid
  );
}

// A Lead Docket-flavored dead-lead export.
const CSV = [
  `Lead Id,Name,Phone,Case Type,Incident Date,Created Date,Last Contact,Status,Sub Status,Contact Attempts,Language,Notes`,
  // Live case the cadence quit on after 2 attempts: rear-end, surgery, company truck.
  `LD-1001,Maria Gonzalez,(555) 111-2222,Auto Accident,5/2/2026,5/3/2026,5/10/2026,Lost,Chase Complete,2,Spanish,"Rear-ended by a company truck on the 405, had surgery on her back."`,
  // Statute likely run (incident > 2 years before NOW).
  `LD-1002,Old Case,(555) 222-3333,Auto Accident,3/1/2024,3/2/2024,4/1/2024,Lost,,4,,Minor soft tissue`,
  // Excluded case type for the california-pi ruleset.
  `LD-1003,Work Injury,(555) 333-4444,Workers Comp,6/1/2026,6/2/2026,6/20/2026,Rejected,,1,,Hurt at the warehouse`,
  // Retained another firm — the legitimate stopping rule.
  `LD-1004,Gone Elsewhere,(555) 444-5555,Dog Bite,6/5/2026,6/6/2026,6/25/2026,Lost,,3,,"Caller said she hired another firm last week"`,
  // No phone number -> needs info, never silently dropped.
  `LD-1005,No Phone,,Slip and Fall,6/10/2026,6/11/2026,,Lost,,,,Fell at a grocery store`,
  // Junk row.
  `,,,,,,,,,,,`,
].join("\n");

// --- pure parsing ----------------------------------------------------------------

test("parseCsv handles quotes, commas, and CRLF", () => {
  const rows = parseCsv(`a,b\r\n"x, y","he said ""hi"""\r\n`);
  assert.deepEqual(rows, [
    ["a", "b"],
    ["x, y", 'he said "hi"'],
  ]);
});

test("header mapping + normalization read a Lead Docket-ish row", () => {
  const rows = parseCsv(CSV);
  const mapping = mapHeaders(rows[0]);
  const lead = normalizeRow(mapping, rows[0], rows[1]);
  assert.equal(lead.external_lead_id, "LD-1001");
  assert.equal(lead.prospect_name, "Maria Gonzalez");
  assert.equal(lead.prospect_phone, "5551112222");
  assert.equal(lead.case_type, "auto_accident");
  assert.equal(lead.incident_date, "2026-05-02");
  assert.equal(lead.attempts, 2);
  assert.equal(lead.language, "es");
  assert.match(lead.notes, /company truck/);
  assert.equal(lead.raw["Status"], "Lost");
});

test("case type and date normalization stay honest on unknowns", () => {
  assert.equal(normalizeCaseType("MVA"), "auto_accident");
  assert.equal(normalizeCaseType("Premises Liability"), "slip_and_fall");
  assert.equal(normalizeCaseType("Mass Tort"), null);
  assert.equal(parseDateish("5/2/2026"), "2026-05-02");
  assert.equal(parseDateish("2026-05-02T10:00:00Z"), "2026-05-02");
  assert.equal(parseDateish("sometime last spring"), null);
});

// --- triage rules ------------------------------------------------------------------

const TUNABLES = {
  caseTypesExcluded: ["medical_malpractice", "workers_comp"],
  geography: { state: "CA", counties: [] },
};

test("screening is limited to legally-determinable facts", () => {
  const expired = screenLead(
    { prospect_phone: "5550000000", case_type: "auto_accident", incident_date: "2024-03-01", notes: "" },
    { tunables: TUNABLES, now: NOW }
  );
  assert.equal(expired.verdict, "screened_out");
  assert.match(expired.screenReason, /statute likely run/);
  assert.match(expired.screenReason, /attorney must verify/);

  const excluded = screenLead(
    { prospect_phone: "5550000000", case_type: "workers_comp", incident_date: "2026-06-01" },
    { tunables: TUNABLES, now: NOW }
  );
  assert.equal(excluded.verdict, "screened_out");
  assert.match(excluded.screenReason, /excluded list/);

  // A weak-looking case (soft tissue, no coverage info) is NOT screened out —
  // severity and coverage are value signals, never gates.
  const weak = screenLead(
    { prospect_phone: "5550000000", case_type: "auto_accident", incident_date: "2026-06-01", notes: "minor soft tissue, unknown insurance" },
    { tunables: TUNABLES, now: NOW }
  );
  assert.equal(weak.verdict, "rescue_candidate");
});

test("a possible government defendant warns but never screens out", () => {
  const lead = {
    prospect_phone: "5550000000",
    case_type: "auto_accident",
    incident_date: "2025-11-01", // ~8 months ago: past a 6-month claim window, inside 2-year statute
    notes: "hit by a city bus downtown",
  };
  const screened = screenLead(lead, { tunables: TUNABLES, now: NOW });
  assert.equal(screened.verdict, "rescue_candidate");
  assert.ok(screened.sol.notes.some((n) => /911\.2/.test(n)));
});

test("missing attempt count is an unknown, never 'stopped too early'", () => {
  const gap = classifyTriageGap({ attempts: null, crm_status: "Lost", notes: "" });
  assert.equal(gap.kind, "unknown_gap");
  const gap2 = classifyTriageGap({ attempts: 2, crm_status: "Lost", notes: "" });
  assert.equal(gap2.kind, "stopped_too_early");
  assert.match(gap2.basis, /Velocify/);
});

test("language never changes the merit read — tier identical, gap differs", () => {
  const base = {
    prospect_phone: "5550000000",
    case_type: "auto_accident",
    incident_date: "2026-06-01",
    lead_created_at: "2026-06-02",
    notes: "had surgery after the crash",
    attempts: 5,
  };
  const english = triageLead({ ...base, language: "en" }, { tunables: TUNABLES, now: NOW });
  const spanish = triageLead({ ...base, language: "es" }, { tunables: TUNABLES, now: NOW });
  assert.equal(english.verdict, "rescue_candidate");
  assert.equal(spanish.verdict, "rescue_candidate");
  assert.deepEqual(spanish.valueTier, english.valueTier); // merit identical
  assert.equal(spanish.recoverability.recoverability, english.recoverability.recoverability);
  assert.equal(spanish.gap.kind, "language_gap"); // only the HOW-to-call-back differs
  assert.match(spanish.gap.basis, /never changes the merit read/i);
});

test("value tier is cited and markers only raise it", () => {
  const plain = valueTier({ case_type: "auto_accident", notes: "bumper damage" });
  assert.equal(plain.tier, "standard");
  const injured = valueTier({ case_type: "auto_accident", notes: "she had surgery on her back" });
  assert.equal(injured.tier, "elevated");
  assert.match(injured.basis, /"surgery"/);
  const commercial = valueTier({ case_type: "auto_accident", notes: "surgery after a company truck rear-ended him" });
  assert.equal(commercial.tier, "high");
  assert.match(commercial.basis, /company truck/);
  const death = valueTier({ case_type: "wrongful_death", notes: "" });
  assert.equal(death.tier, "high");
});

test("recoverability is staleness-based with a cited basis", () => {
  const fresh = recoverabilityEstimate({ last_contact_at: "2026-07-01" }, NOW);
  assert.equal(fresh.recoverability, 0.5);
  const nineMonths = recoverabilityEstimate({ last_contact_at: "2025-11-01" }, NOW);
  assert.equal(nineMonths.recoverability, 0.25);
  assert.match(nineMonths.basis, /Falkowitz/);
  const unknown = recoverabilityEstimate({}, NOW);
  assert.equal(unknown.recoverability, 0.3);
});

// --- end-to-end import into the conveyor ---------------------------------------------

test("importDeadLeads: triages every row, surfaces only candidates, stays idempotent", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);

  const result = await importDeadLeads({
    db,
    firmId,
    csvText: CSV,
    crm: "leaddocket",
    filename: "dead-leads.csv",
    importedBy: "Ali Ansari",
    now: NOW,
  });

  assert.equal(result.rows, 6);
  assert.equal(result.surfaced, 1); // Maria
  assert.equal(result.screenedOut, 3); // statute run, workers comp, hired another firm
  assert.equal(result.needsInfo, 1); // no phone
  assert.equal(result.skipped, 1); // junk row

  // Honest denominator: every non-junk row is recorded with its verdict.
  const allLeads = await listCrmLeads(db, firmId);
  assert.equal(allLeads.length, 5);
  const batches = await listImportBatches(db, firmId);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].rubric_version, TRIAGE_RUBRIC_VERSION);
  assert.equal(batches[0].imported_by, "Ali Ansari");

  // Only the candidate got a call + flag + review-queue entry; screened-out
  // rows never touch the conveyor.
  const surfaced = allLeads.filter((l) => l.verdict === "rescue_candidate");
  assert.equal(surfaced.length, 1);
  assert.ok(surfaced[0].flag_id != null);
  assert.ok(allLeads.filter((l) => l.verdict !== "rescue_candidate").every((l) => l.flag_id == null));
  const pending = await listReviewItems(db, firmId, "pending");
  assert.equal(pending.length, 1);

  // Maria's triage read: Spanish gap, high tier (surgery + company truck), SOL known.
  assert.equal(surfaced[0].gap_kind, "language_gap");
  assert.equal(surfaced[0].value_tier, "high");
  assert.match(surfaced[0].value_tier_basis, /surgery/);
  assert.equal(surfaced[0].sol_deadline, "2028-05-02");

  // Re-importing the same export duplicates nothing.
  const again = await importDeadLeads({
    db,
    firmId,
    csvText: CSV,
    crm: "leaddocket",
    importedBy: "Ali Ansari",
    now: NOW,
  });
  assert.equal(again.surfaced, 0);
  assert.equal(again.skipped, 6); // 5 known external ids + 1 junk row
  assert.equal((await listCrmLeads(db, firmId)).length, 5);
});

test("imported candidate flows through review into a packet with SOL-aware ranking", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);

  await importDeadLeads({ db, firmId, csvText: CSV, crm: "leaddocket", importedBy: "Ali", now: NOW });

  // Unreviewed -> no packet (invariant d holds for imports too).
  const empty = await buildDailyPacket({ db, firmId, now: NOW });
  assert.equal(empty.empty, true);

  const [item] = await listReviewItems(db, firmId, "pending");
  await confirmFlag({ db, reviewItemId: item.id, reviewer: "Ali", now: NOW });

  const packet = await buildDailyPacket({ db, firmId, now: NOW });
  assert.equal(packet.items.length, 1);
  const packeted = packet.items[0];
  assert.equal(packeted.prospect_name, "Maria Gonzalez");
  assert.equal(packeted.sol_deadline, "2028-05-02"); // carried from the triage read
  assert.match(packeted.diagnosis, /Spanish-language lead/);
  assert.match(packeted.callback_script, /Maria Gonzalez/);

  // The export leg: tagged CSV for CRM re-import, tier not dollars.
  const crmLead = await getCrmLeadByFlag(db, packeted.flag_id);
  const csv = rescueListToCrmCsv([
    {
      ...packeted,
      external_lead_id: crmLead.external_lead_id,
      value_tier: crmLead.value_tier,
      value_tier_basis: crmLead.value_tier_basis,
      gap_kind: crmLead.gap_kind,
      rescue_tag: "RSQ-2026-000001",
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[1], /LD-1001/);
  assert.match(lines[1], new RegExp(RESCUE_STATUS_LABEL.replace("—", "—")));
  assert.match(lines[1], /high/);
  assert.ok(!/\$\d/.test(csv), "export must never carry dollar figures");
});

test("importDeadLeads requires a named importer and a usable CSV", async (t) => {
  const db = makeDb(t);
  const firmId = makeFirm(db);
  await assert.rejects(
    () => importDeadLeads({ db, firmId, csvText: CSV, crm: "leaddocket", importedBy: "  " }),
    /named importer/
  );
  await assert.rejects(
    () => importDeadLeads({ db, firmId, csvText: "just,some\nnumbers,1", crm: "leaddocket", importedBy: "Ali" }),
    /no recognizable columns/
  );
});
