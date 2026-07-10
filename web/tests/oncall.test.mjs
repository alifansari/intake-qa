// Tests for the on-call / acknowledgment engine (Phase 4): default config
// validity, no-silent-gaps validation, override precedence stack, rotation
// math, the fatality-tier floor, ladder building, waterfall-to-backstop, and
// the Acked→Actioned→Resolved transition authority.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defaultConfig,
  normalizeConfig,
  validateConfig,
  resolveOnCall,
  buildLadder,
  nextWaterfallAction,
  validTransition,
  ackDeadline,
  HOT_FLOOR,
} from "../src/lib/oncall/engine.mjs";

const AT = new Date("2026-07-09T18:00:00Z");

test("solo default config is valid and maps every tier to the founder", () => {
  const cfg = defaultConfig("Ali");
  assert.deepEqual(validateConfig(cfg), []);
  for (const tier of ["hot", "warm", "flagged"]) {
    const ladder = buildLadder(cfg, tier);
    assert.equal(ladder.at(-1).kind, "backstop", `${tier} ladder ends in backstop`);
  }
  assert.equal(resolveOnCall(cfg, "primary", AT).person, "Ali");
});

test("no silent gaps: empty backstop or empty role fails validation", () => {
  const cfg = defaultConfig("Ali");
  const noBackstop = { ...cfg, roles: { ...cfg.roles, backstop: { members: [] } } };
  assert.ok(validateConfig(noBackstop).some((e) => e.includes("backstop")));
  const emptyRole = { ...cfg, roles: { ...cfg.roles, primary: { members: [] } } };
  assert.ok(validateConfig(emptyRole).some((e) => e.includes('"primary"')));
});

test("ladder chain referencing a missing role fails validation", () => {
  const cfg = defaultConfig("Ali");
  cfg.ladders.hot.chain = ["primary", "ghost_role"];
  assert.ok(validateConfig(cfg).some((e) => e.includes("ghost_role")));
});

test("override precedence: manual hold > swap > holiday > rotation", () => {
  const cfg = defaultConfig("Ali");
  cfg.roles.primary.members = ["Ali"];
  const day = "2026-07-09";
  cfg.holidays = [{ date: day, covers: { role: "primary", person: "HolidayCover" } }];
  assert.equal(resolveOnCall(cfg, "primary", AT).person, "HolidayCover");
  cfg.swaps = [{ role: "primary", person: "SwapCover", starts_at: `${day}T00:00:00Z`, ends_at: `${day}T23:59:59Z` }];
  assert.equal(resolveOnCall(cfg, "primary", AT).person, "SwapCover");
  cfg.holds = [{ role: "primary", person: "HoldCover", starts_at: `${day}T00:00:00Z`, ends_at: `${day}T23:59:59Z` }];
  const r = resolveOnCall(cfg, "primary", AT);
  assert.equal(r.person, "HoldCover");
  assert.equal(r.source, "manual_hold");
});

test("expired overrides fall through to rotation", () => {
  const cfg = defaultConfig("Ali");
  cfg.swaps = [{ role: "primary", person: "OldSwap", starts_at: "2026-01-01T00:00:00Z", ends_at: "2026-01-02T00:00:00Z" }];
  assert.equal(resolveOnCall(cfg, "primary", AT).person, "Ali");
});

test("rotation cycles members by period", () => {
  const cfg = defaultConfig("Ali");
  cfg.roles.primary = { members: ["A", "B"], rotation_start: "2026-07-06", period_days: 7 };
  // Week of Jul 6 → index 0 (A); week of Jul 13 → index 1 (B).
  assert.equal(resolveOnCall(cfg, "primary", new Date("2026-07-09T12:00:00Z")).person, "A");
  assert.equal(resolveOnCall(cfg, "primary", new Date("2026-07-16T12:00:00Z")).person, "B");
  assert.equal(resolveOnCall(cfg, "primary", new Date("2026-07-23T12:00:00Z")).person, "A");
});

test("fatality-tier floor: hot ladder cannot be slowed past the floor", () => {
  const cfg = normalizeConfig({
    ladders: { hot: { chain: ["primary"], ack_timeout_minutes: 240, realert_minutes: 120 } },
  }, "Ali");
  assert.equal(cfg.ladders.hot.ack_timeout_minutes, HOT_FLOOR.ack_timeout_minutes);
  assert.equal(cfg.ladders.hot.realert_minutes, HOT_FLOOR.realert_minutes);
  // …but it CAN be made faster.
  const fast = normalizeConfig({
    ladders: { hot: { chain: ["primary"], ack_timeout_minutes: 5, realert_minutes: 2 } },
  }, "Ali");
  assert.equal(fast.ladders.hot.ack_timeout_minutes, 5);
});

test("warm/flagged ladders are firm-configurable without a floor", () => {
  const cfg = normalizeConfig({
    ladders: { warm: { chain: ["primary"], ack_timeout_minutes: 240, realert_minutes: 60 } },
  }, "Ali");
  assert.equal(cfg.ladders.warm.ack_timeout_minutes, 240);
});

test("waterfall: hot chain steps primary → backup → unclaimed backstop", () => {
  const cfg = defaultConfig("Ali");
  cfg.roles.backup.members = ["Backup Bob"];
  const step0 = nextWaterfallAction(cfg, "hot", 0, AT);
  assert.equal(step0.kind, "waterfall");
  assert.equal(step0.target.person, "Backup Bob");
  const step1 = nextWaterfallAction(cfg, "hot", 1, AT);
  assert.equal(step1.kind, "unclaimed");
  assert.deepEqual(step1.actions, ["book_callback", "dashboard_alarm"]);
  assert.equal(step1.target.person, "Ali", "backstop is always a person");
});

test("single-target warm chain goes straight to backstop when overdue", () => {
  const cfg = defaultConfig("Ali");
  const a = nextWaterfallAction(cfg, "warm", 0, AT);
  assert.equal(a.kind, "unclaimed");
});

test("transition authority: fired→routed→acked→actioned→resolved; unclaimed claimable", () => {
  assert.ok(validTransition("fired", "routed"));
  assert.ok(validTransition("routed", "acked"));
  assert.ok(validTransition("acked", "actioned"));
  assert.ok(validTransition("actioned", "resolved"));
  assert.ok(validTransition("unclaimed", "acked"), "a human can claim after backstop");
  assert.ok(!validTransition("resolved", "acked"), "resolved is terminal");
  assert.ok(!validTransition("fired", "resolved"), "cannot skip ownership");
  assert.ok(!validTransition("routed", "actioned"), "actioned requires an acked owner");
});

test("ackDeadline honors the tier ladder", () => {
  const cfg = defaultConfig("Ali");
  const fired = new Date("2026-07-09T18:00:00Z");
  const hot = new Date(ackDeadline(cfg, "hot", fired)).getTime() - fired.getTime();
  assert.equal(hot, HOT_FLOOR.ack_timeout_minutes * 60000);
  const warm = new Date(ackDeadline(cfg, "warm", fired)).getTime() - fired.getTime();
  assert.equal(warm, 60 * 60000);
});
