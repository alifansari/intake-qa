// Tests for firm onboarding: the pure template-pack + firm-config logic and the
// template-version DB helpers. No network, no key — parsing/validation is pure
// and the versioning uses a temp SQLite DB. The point of validateTemplatePack is
// that the wizard can ONLY accept a pack that would pass the send chokepoint's
// compliance guard, so we assert both the happy path and the rejections.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openMigratedDb } from "../db/connection.mjs";
import {
  createFirm,
  saveTemplateVersion,
  getLatestTemplateVersion,
  listTemplateVersions,
} from "../ingest/db.mjs";
import {
  parseTemplatePack,
  validateTemplatePack,
  nextVersion,
} from "../onboarding/template-pack.mjs";
import {
  normalizeFirmInput,
  buildFirmConfigMarkdown,
  CASE_TYPE_CATALOG,
} from "../onboarding/firm-config.mjs";

function makeDb(t) {
  const dir = mkdtempSync(join(tmpdir(), "intakeqa-onboard-"));
  const db = openMigratedDb(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

const GOOD_PACK = `Any preamble here is ignored.

=== TEMPLATE id=warm | name=Warm follow-up ===
Hi {{first_name}}, this is the intake team at {{firm_name}} following up on your call. Is now a good time for a quick callback? No obligation. Reply STOP to opt out.

=== TEMPLATE id=help | name=Here to help ===
Hi {{first_name}}, it's {{firm_name}}. We'd still like to listen and see how we can help. When's a good time to talk? Reply STOP to opt out.`;

test("parseTemplatePack ignores preamble and splits blocks", () => {
  const tpl = parseTemplatePack(GOOD_PACK);
  assert.equal(tpl.length, 2);
  assert.equal(tpl[0].id, "warm");
  assert.equal(tpl[1].name, "Here to help");
  assert.ok(tpl[0].body.includes("{{firm_name}}"));
});

test("validateTemplatePack: compliant pack passes", () => {
  const v = validateTemplatePack(GOOD_PACK, { firmName: "Demo Firm" });
  assert.equal(v.valid, true);
  assert.equal(v.count, 2);
  assert.ok(v.results.every((r) => r.errors.length === 0));
});

test("validateTemplatePack: missing opt-out is rejected", () => {
  const pack = `=== TEMPLATE id=x | name=No opt out ===
Hi {{first_name}}, this is {{firm_name}} following up on your call.`;
  const v = validateTemplatePack(pack, { firmName: "Demo Firm" });
  assert.equal(v.valid, false);
  assert.ok(v.results[0].errors.some((e) => /opt-out/i.test(e)));
});

test("validateTemplatePack: banned legal-advice content is rejected", () => {
  const pack = `=== TEMPLATE id=y | name=Bad ===
Hi {{first_name}}, {{firm_name}} here — you have a strong case. Reply STOP to opt out.`;
  const v = validateTemplatePack(pack, { firmName: "Demo Firm" });
  assert.equal(v.valid, false);
  assert.ok(v.results[0].errors.some((e) => /prohibited/i.test(e)));
});

test("validateTemplatePack: empty pack is rejected", () => {
  const v = validateTemplatePack("just some notes, no templates", {});
  assert.equal(v.valid, false);
  assert.ok(v.packErrors.some((e) => /no templates/i.test(e)));
});

test("nextVersion is monotonic and 1-based", () => {
  assert.equal(nextVersion(undefined), 1);
  assert.equal(nextVersion(0), 1);
  assert.equal(nextVersion(3), 4);
});

test("normalizeFirmInput computes avg fee and drops unknown case types", () => {
  const firm = normalizeFirmInput({
    name: "  Ortiz Injury Law  ",
    subscriptionPrice: "1500",
    accepted: [
      { key: "mva_standard", fee: "10000" },
      { key: "dog_bite" }, // no fee -> default (15000)
      { key: "not_a_real_type", fee: "999" }, // dropped
    ],
  });
  assert.equal(firm.name, "Ortiz Injury Law");
  assert.equal(firm.timezone, "America/Los_Angeles");
  assert.equal(firm.subscriptionPrice, 1500);
  assert.equal(firm.accepted.length, 2);
  assert.equal(firm.avgCaseFee, Math.round((10000 + 15000) / 2));
  assert.ok(firm.declined.includes("motorcycle"));
});

test("normalizeFirmInput requires a name and at least one case type", () => {
  assert.throws(() => normalizeFirmInput({ name: "", accepted: [{ key: "dog_bite" }] }), /name/i);
  assert.throws(() => normalizeFirmInput({ name: "X", accepted: [] }), /case type/i);
});

test("buildFirmConfigMarkdown carries the calibrated field layout + estimate flag", () => {
  const firm = normalizeFirmInput({
    name: "Ortiz Injury Law",
    accepted: [{ key: "mva_commercial", fee: 45000 }],
  });
  const md = buildFirmConfigMarkdown(firm);
  assert.ok(md.includes("firm_name: Ortiz Injury Law"));
  assert.ok(md.includes("state: CA"));
  assert.ok(md.includes("fee_values_estimated: true"));
  assert.ok(md.includes("mva_commercial $45,000"));
  assert.ok(CASE_TYPE_CATALOG.length >= 5);
});

test("saveTemplateVersion is monotonic per firm; getLatest + list reflect it", (t) => {
  const db = makeDb(t);
  const firmId = createFirm(db, { name: "Ortiz Injury Law", avg_case_fee: 20000, subscription_price: 1500 });

  const pack1 = parseTemplatePack(GOOD_PACK);
  const v1 = saveTemplateVersion(db, { firm_id: firmId, pack: pack1, approved_by: "Attorney Ortiz" });
  assert.equal(v1.version, 1);

  const pack2 = pack1.slice(0, 1); // edited pack
  const v2 = saveTemplateVersion(db, { firm_id: firmId, pack: pack2, approved_by: "Attorney Ortiz" });
  assert.equal(v2.version, 2);

  const latest = getLatestTemplateVersion(db, firmId);
  assert.equal(latest.version, 2);
  assert.equal(latest.pack.length, 1);
  assert.equal(latest.approved_by, "Attorney Ortiz");

  const all = listTemplateVersions(db, firmId);
  assert.equal(all.length, 2);
  assert.equal(all[0].version, 2); // newest first
});
