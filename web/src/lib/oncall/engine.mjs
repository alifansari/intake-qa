// ============================================================================
// On-call / acknowledgment engine — pure logic (Phase 4).
//
// Guarantees the spec demands:
//   * Coverage windows are ALWAYS assigned — resolveOnCall() can never return
//     nobody, because the config is invalid without an active backstop and
//     resolution falls through to it. "No silent gaps" is validateConfig()'s
//     job, not the operator's memory.
//   * Override precedence stack (highest wins):
//       manual hold  >  one-off swap  >  holiday calendar  >  rotation
//   * Ack is a DELIBERATE action by a NAMED person (store enforces the name).
//     Delivery/read receipts are never treated as acknowledgment.
//   * Per-tier timeout ladder → waterfall: primary → backup → chain… →
//     BACKSTOP, which always (a) books a callback commitment for the lead and
//     (b) raises the "escalation-unclaimed" dashboard alarm. Re-alert cadence
//     fires between waterfall hops.
//   * Lifecycle: fired → routed → acked → actioned → resolved (+ unclaimed).
//     Acked means "a person owns this"; Actioned means "the person did the
//     thing"; Resolved closes it. validTransition() is the single authority.
//   * Solo-friendly default: every tier routes to the founder, with a
//     PROTECTED FATALITY-TIER FLOOR — the hot ladder cannot be configured
//     slower than the floor (normalizeConfig clamps it).
// ============================================================================

export const ONCALL_CONFIG_VERSION = "oncall-v1";

// Fatality-tier floor: hot escalations may never wait longer than these,
// no matter what a firm types into config (clamped in normalizeConfig).
export const HOT_FLOOR = { ack_timeout_minutes: 10, realert_minutes: 5 };

// Solo-friendly default: one human everywhere, backstop included.
export function defaultConfig(founderName = "Founder") {
  return {
    version: ONCALL_CONFIG_VERSION,
    roles: {
      primary: { members: [founderName], rotation_start: "2026-01-01", period_days: 7 },
      backup: { members: [founderName], rotation_start: "2026-01-01", period_days: 7 },
      backstop: { members: [founderName] }, // backstop never rotates empty
    },
    // Waterfall chain per tier: role names in order, then the implicit backstop.
    ladders: {
      hot: { chain: ["primary", "backup"], ack_timeout_minutes: 10, realert_minutes: 5 },
      warm: { chain: ["primary"], ack_timeout_minutes: 60, realert_minutes: 30 },
      flagged: { chain: ["primary"], ack_timeout_minutes: 24 * 60, realert_minutes: 12 * 60 },
    },
    holidays: [], // [{ date:"2026-11-26", covers:{ role:"primary", person:"Name" } }]
    swaps: [],    // [{ role, person, starts_at, ends_at }]
    holds: [],    // manual holds: [{ role, person, starts_at, ends_at, note }]
  };
}

// Clamp/normalize a raw config: version stamp, fatality floor on the hot
// ladder, arrays present. Returns a NEW object (never mutates input).
export function normalizeConfig(raw, founderName = "Founder") {
  const base = defaultConfig(founderName);
  const cfg = {
    ...base,
    ...(raw ?? {}),
    roles: { ...base.roles, ...(raw?.roles ?? {}) },
    ladders: { ...base.ladders, ...(raw?.ladders ?? {}) },
    holidays: Array.isArray(raw?.holidays) ? raw.holidays : [],
    swaps: Array.isArray(raw?.swaps) ? raw.swaps : [],
    holds: Array.isArray(raw?.holds) ? raw.holds : [],
  };
  // PROTECTED FATALITY-TIER FLOOR: hot can be made faster, never slower.
  const hot = { ...cfg.ladders.hot };
  hot.ack_timeout_minutes = Math.min(
    hot.ack_timeout_minutes ?? HOT_FLOOR.ack_timeout_minutes,
    HOT_FLOOR.ack_timeout_minutes,
  );
  hot.realert_minutes = Math.min(
    hot.realert_minutes ?? HOT_FLOOR.realert_minutes,
    HOT_FLOOR.realert_minutes,
  );
  cfg.ladders = { ...cfg.ladders, hot };
  return cfg;
}

// "No silent gaps": structural validation. Empty array = valid.
export function validateConfig(cfg) {
  const errors = [];
  const backstop = cfg?.roles?.backstop;
  if (!backstop?.members?.length) {
    errors.push("backstop role must have at least one person — coverage may never be unassigned");
  }
  for (const [name, role] of Object.entries(cfg?.roles ?? {})) {
    if (!role.members || role.members.length === 0) {
      errors.push(`role "${name}" has no humans mapped in`);
    }
  }
  for (const [tier, ladder] of Object.entries(cfg?.ladders ?? {})) {
    if (!Array.isArray(ladder.chain) || ladder.chain.length === 0) {
      errors.push(`tier "${tier}" has an empty waterfall chain`);
    }
    for (const role of ladder.chain ?? []) {
      if (!cfg.roles?.[role]) errors.push(`tier "${tier}" chain references missing role "${role}"`);
    }
    if (!(ladder.ack_timeout_minutes > 0)) errors.push(`tier "${tier}" needs a positive ack timeout`);
  }
  return errors;
}

// Whose duty is it for `role` at time `at`? Precedence:
//   manual hold > swap > holiday > rotation. Falls back to the role's first
// member, then to the backstop — someone is ALWAYS returned for a valid config.
export function resolveOnCall(cfg, role, at = new Date()) {
  const t = at.getTime();
  const inWindow = (w) =>
    (!w.starts_at || new Date(w.starts_at).getTime() <= t) &&
    (!w.ends_at || t < new Date(w.ends_at).getTime());

  const hold = (cfg.holds ?? []).find((h) => h.role === role && inWindow(h));
  if (hold?.person) return { person: hold.person, source: "manual_hold" };

  const swap = (cfg.swaps ?? []).find((s) => s.role === role && inWindow(s));
  if (swap?.person) return { person: swap.person, source: "swap" };

  const dateStr = at.toISOString().slice(0, 10);
  const holiday = (cfg.holidays ?? []).find(
    (h) => h.date === dateStr && h.covers?.role === role && h.covers?.person,
  );
  if (holiday) return { person: holiday.covers.person, source: "holiday" };

  const r = cfg.roles?.[role];
  if (r?.members?.length) {
    if (r.rotation_start && r.period_days > 0 && r.members.length > 1) {
      const days = Math.floor((t - new Date(`${r.rotation_start}T00:00:00Z`).getTime()) / 86400000);
      const idx = Math.floor(days / r.period_days) % r.members.length;
      return { person: r.members[((idx % r.members.length) + r.members.length) % r.members.length], source: "rotation" };
    }
    return { person: r.members[0], source: "rotation" };
  }

  const backstop = cfg.roles?.backstop?.members?.[0];
  return { person: backstop ?? "UNASSIGNED", source: "backstop" };
}

// Build the full ack ladder for a tier: one step per chain role, then the
// backstop terminal. Each step carries its deadline offset from fire time.
export function buildLadder(cfg, tier) {
  const ladder = cfg.ladders?.[tier] ?? cfg.ladders?.flagged;
  const steps = ladder.chain.map((role, i) => ({
    step: i,
    role,
    kind: "target",
    timeout_minutes: ladder.ack_timeout_minutes,
    realert_minutes: ladder.realert_minutes,
  }));
  steps.push({ step: steps.length, role: "backstop", kind: "backstop" });
  return steps;
}

// Given an unacked escalation at waterfall position `step`, past its
// deadline, what happens next?
//   → next chain target (kind 'waterfall'), or
//   → the backstop (kind 'unclaimed'): book callback + dashboard alarm.
export function nextWaterfallAction(cfg, tier, step, at = new Date()) {
  const ladder = buildLadder(cfg, tier);
  const next = ladder[step + 1];
  if (!next || next.kind === "backstop") {
    const person = resolveOnCall(cfg, "backstop", at);
    return {
      kind: "unclaimed",
      target: person,
      actions: ["book_callback", "dashboard_alarm"],
    };
  }
  return {
    kind: "waterfall",
    step: next.step,
    target: resolveOnCall(cfg, next.role, at),
    deadline_minutes: next.timeout_minutes,
  };
}

// --- Acked → Actioned → Resolved --------------------------------------------
const TRANSITIONS = {
  fired: ["routed", "acked", "unclaimed"],
  routed: ["acked", "unclaimed"],
  acked: ["actioned", "resolved"],
  actioned: ["resolved"],
  unclaimed: ["acked"], // a human can still claim after the backstop fired
  resolved: [],
};

export function validTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function ackDeadline(cfg, tier, firedAt = new Date()) {
  const ladder = cfg.ladders?.[tier] ?? cfg.ladders?.flagged;
  return new Date(firedAt.getTime() + ladder.ack_timeout_minutes * 60000).toISOString();
}
