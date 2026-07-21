import { test } from "node:test";
import assert from "node:assert/strict";
import { composeIntakeFile } from "../src/lib/desk/intake-file.mjs";
import { pushIntake, pushFlag } from "../integrations/filevine.mjs";

const CASE_TYPES = [
  { id: "mva_standard", label: "Car accident" },
  { id: "product", label: "Defective product" },
];

test("composeIntakeFile builds a records-grade intake file with SALI code", () => {
  const record = composeIntakeFile({
    id: 42,
    caseTypes: CASE_TYPES,
    form: {
      caller_name: "Maria Delgado",
      caller_phone: "+13235550142",
      case_type: "mva_standard",
      incident_date: "2026-07-10",
      liability: "clear",
      injury: "hard",
      coverage: "high",
      ambulance_transport: true,
      red_flags: { already_represented: false },
    },
    verdict: {
      disposition: "sign_now",
      value_tier: "high",
      driving_reason: "Clear liability, treated injury, solvent coverage.",
      sol: { deadline_date: "2028-07-10", urgency: "ok" },
      attorney_review_required: false,
    },
  });

  assert.equal(record.external_ref, "42");
  assert.equal(record.person.name, "Maria Delgado");
  assert.equal(record.incident.area_of_law_sali, "TORT-NGMP"); // SALI Area-of-Law
  assert.equal(record.disposition, "sign_now");
  assert.ok(record.facts.some((f) => f.key === "ambulance_transport"));
  assert.ok(record.summary.includes("Car accident"));
  assert.ok(record.summary.includes("not a final decision or legal advice"));
});

test("product case maps to the TORT-PRDL SALI code", () => {
  const r = composeIntakeFile({ caseTypes: CASE_TYPES, form: { case_type: "product" } });
  assert.equal(r.incident.area_of_law_sali, "TORT-PRDL");
});

test("pushIntake creates person -> project -> note via the Filevine contract", async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: JSON.parse(opts.body) });
    if (url.endsWith("/core/persons")) return { ok: true, json: async () => ({ personId: "P1" }) };
    if (url.endsWith("/core/projects")) return { ok: true, json: async () => ({ projectId: "PRJ9" }) };
    return { ok: true, json: async () => ({}) };
  };

  const record = composeIntakeFile({
    id: 7,
    caseTypes: CASE_TYPES,
    form: { caller_name: "Maria Delgado", case_type: "mva_standard", liability: "clear", injury: "hard" },
    verdict: { disposition: "sign_now", sol: { deadline_date: "2028-07-10" } },
  });

  const ctx = {
    fetchImpl,
    live: true, // exercise the transmit path against the mock
    creds: JSON.stringify({ pat: "PAT123", orgId: "ORG1", userId: "USR1" }),
    fieldMap: { projectTypeId: "PT-auto", custom: { liability: "liab_sel", disposition: "dispo_sel" } },
  };
  const res = await pushIntake(ctx, { record });

  assert.equal(res.delivered, true);
  assert.equal(res.projectId, "PRJ9");
  assert.equal(res.personId, "P1");
  // Auth + org/user headers present.
  assert.equal(calls[0].headers.authorization, "Bearer PAT123");
  assert.equal(calls[0].headers["x-fv-orgid"], "ORG1");
  assert.equal(calls[0].headers["x-fv-userid"], "USR1");
  // Project carries the per-firm custom-field selectors + externalRef.
  const project = calls.find((c) => c.url.endsWith("/core/projects"));
  assert.equal(project.body.projectTypeId, "PT-auto");
  assert.equal(project.body.externalRef, "7");
  assert.equal(project.body["custom.liab_sel"], "Clearly the other side");
  assert.ok(typeof project.body["custom.dispo_sel"] === "string" && project.body["custom.dispo_sel"].length > 0);
  // The matter gets the full summary as a note.
  const note = calls.find((c) => c.url.includes("/notes"));
  assert.ok(note && typeof note.body.body === "string" && note.body.body.length > 0);
});

test("pushIntake SIMULATES (no network) unless the live-gate is on", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, json: async () => ({}) };
  };
  const record = composeIntakeFile({
    caseTypes: CASE_TYPES,
    form: { caller_name: "Sim Only", case_type: "mva_standard" },
  });
  // live omitted -> default off
  const res = await pushIntake({ fetchImpl, creds: JSON.stringify({ pat: "P", orgId: "O", userId: "U" }) }, { record });
  assert.equal(calls, 0, "no HTTP call when simulating");
  assert.equal(res.delivered, false);
  assert.equal(res.simulated, true);
});

test("pushFlag skips without a Filevine project ref (a call has no project yet)", async () => {
  let calls = 0;
  const res = await pushFlag(
    { live: true, fetchImpl: async () => ((calls += 1), { ok: true, json: async () => ({}) }) },
    { flag: { qualification_score: 88, is_leaked_signable: 1, reason: "no ask" } },
  );
  assert.equal(res.skipped, true);
  assert.equal(res.reason, "no_project_ref");
  assert.equal(calls, 0);
});
